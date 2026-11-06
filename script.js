
// 1. HÀM ĐĂNG NHẬP

async function login(username, password) {
  // Loại bỏ khoảng trắng thừa ở đầu và cuối tên đăng nhập.
  const trimmedUsername =
    typeof username === "string" ? username.trim() : "";

  // Kiểm tra tên đăng nhập và mật khẩu trước khi gọi API.
  if (
    trimmedUsername === "" ||
    typeof password !== "string" ||
    password.trim() === ""
  ) {
    throw new ApiError(
      400,
      "Vui lòng nhập tên đăng nhập và mật khẩu.",
      null
    );
  }

  try {
    // Gửi POST request kèm thông tin đăng nhập dưới dạng JSON.
    const data = await request("/auth/login", {
      method: "POST",
      body: {
        username: trimmedUsername,
        password: password
      }
    });

    // Trả về toàn bộ dữ liệu đăng nhập từ server.
    return data;
  } catch (error) {
    // Chỉ thay đổi thông báo đối với lỗi HTTP 400.
    if (error.name === "ApiError" && error.status === 400) {
      throw new ApiError(
        400,
        "Sai tên đăng nhập hoặc mật khẩu.",
        error.body
      );
    }

    // Các lỗi khác giữ nguyên như request đã xử lý.
    throw error;
  }
}


// 2. HÀM LẤY THÔNG TIN NGƯỜI DÙNG

async function getMe(token) {
  // Gọi API lấy hồ sơ người dùng thông qua request có xác thực.
  return await authedRequest(token, "/auth/me");
}


// 3. HÀM GỌI API CÓ XÁC THỰC

async function authedRequest(token, url, options = {}) {
  // Kiểm tra token phải là chuỗi và không được rỗng.
  if (typeof token !== "string" || token.trim() === "") {
    throw new ApiError(
      401,
      messageForStatus(401),
      null
    );
  }

  // Kết hợp header của người gọi với header xác thực.
  // Authorization được đặt sau để đảm bảo sử dụng token hiện tại.
  const headers = {
    ...options.headers,
    Authorization: `Bearer ${token.trim()}`
  };

  // Gọi lại request với các tùy chọn ban đầu và header xác thực.
  return await request(url, {
    ...options,
    headers
  });
}


// 4. HÀM ĐĂNG NHẬP VÀ LẤY HỒ SƠ NGƯỜI DÙNG

async function signIn(username, password) {
  try {
    // Gọi login để lấy thông tin và accessToken.
    const loginData = await login(username, password);

    // Lấy accessToken từ kết quả đăng nhập.
    const token = loginData.accessToken;

    // Sử dụng token vừa nhận để lấy hồ sơ người dùng.
    const user = await getMe(token);

    // Trả về trạng thái đăng nhập thành công.
    return {
      state: "success",
      token,
      user,
      error: null
    };
  } catch (error) {
    // Chỉ chuyển đổi lỗi thuộc lớp ApiError.
    if (error.name === "ApiError") {
      return {
        state: "error",
        token: null,
        user: null,
        error: {
          status: error.status,
          message: error.message
        }
      };
    }

    // Các lỗi khác không bị nuốt mà được ném tiếp.
    throw error;
  }
}


// 5. TEST CASE: login()

console.log("===== TEST login() =====");

// Kiểm tra đăng nhập bằng tài khoản Emilys.
login("emilys", "emilyspass")
  .then((data) => {
    console.log(data.username, data.id);
    // Expected: "emilys" 1

    console.log(typeof data.accessToken);
    // Expected: "string"
  })
  .catch((error) => {
    console.log(error.message);
  });

// Kiểm tra tên đăng nhập có khoảng trắng thừa.
login("  emilys  ", "emilyspass")
  .then((data) => {
    console.log(data.username);
    // Expected: "emilys"
  })
  .catch((error) => {
    console.log(error.message);
  });

// Kiểm tra mật khẩu sai.
login("emilys", "sai-mat-khau")
  .catch((error) => {
    console.log(error.status, error.message);
    // Expected: 400 "Sai tên đăng nhập hoặc mật khẩu."
  });

// Kiểm tra bỏ trống tên đăng nhập.
login("", "emilyspass")
  .catch((error) => {
    console.log(error.status, error.message);
    // Expected: 400 "Vui lòng nhập tên đăng nhập và mật khẩu."
  });

// Kiểm tra bỏ trống mật khẩu.
login("emilys", "")
  .catch((error) => {
    console.log(error.status, error.message);
    // Expected: 400 "Vui lòng nhập tên đăng nhập và mật khẩu."
  });


// 6. TEST CASE: getMe()

console.log("===== TEST getMe() =====");

// Kiểm tra lấy hồ sơ bằng token hợp lệ.
login("emilys", "emilyspass")
  .then((data) => getMe(data.accessToken))
  .then((user) => {
    console.log(user.username, user.id);
    // Expected: "emilys" 1
  })
  .catch((error) => {
    console.log(error.message);
  });

// Kiểm tra token không hợp lệ.
getMe("abc")
  .catch((error) => {
    console.log(error.name, error.status);
    // Expected: "ApiError" 401
  });


// 7. TEST CASE: authedRequest()

console.log("===== TEST authedRequest() =====");

// Kiểm tra gọi API có xác thực bằng token hợp lệ.
login("emilys", "emilyspass")
  .then((data) => {
    return authedRequest(data.accessToken, "/auth/me");
  })
  .then((user) => {
    console.log(user.username);
    // Expected: "emilys"
  })
  .catch((error) => {
    console.log(error.message);
  });

// Kiểm tra token rỗng.
authedRequest("", "/products")
  .catch((error) => {
    console.log(error.name, error.status);
    // Expected: "ApiError" 401
  });

// Kiểm tra token không phải chuỗi.
authedRequest(null, "/products")
  .catch((error) => {
    console.log(error.name, error.status);
    // Expected: "ApiError" 401
  });


// 8. TEST CASE: signIn()

console.log("===== TEST signIn() =====");

// Kiểm tra đăng nhập thành công bằng tài khoản Emilys.
signIn("emilys", "emilyspass")
  .then((result) => {
    console.log(result.state);
    // Expected: "success"

    console.log(result.user.username, result.user.id);
    // Expected: "emilys" 1

    console.log(result.error);
    // Expected: null
  });

// Kiểm tra đăng nhập thành công bằng tài khoản Michael.
signIn("michaelw", "michaelwpass")
  .then((result) => {
    console.log(result.state);
    // Expected: "success"

    console.log(result.user.username, result.user.id);
    // Expected: "michaelw" 2
  });

// Kiểm tra đăng nhập sai mật khẩu.
signIn("emilys", "sai-mat-khau")
  .then((result) => {
    console.log(result.state);
    // Expected: "error"

    console.log(result.error.status);
    // Expected: 400

    console.log(result.error.message);
    // Expected: "Sai tên đăng nhập hoặc mật khẩu."

    console.log(result.token, result.user);
    // Expected: null null
  });
