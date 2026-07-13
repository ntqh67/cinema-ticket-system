/**
 * Mục đích: Lớp Controller điều phối sự kiện giao diện và nghiệp vụ xác thực người dùng.
 */
/* CineTicket - Controller xác thực */
// Lớp AuthController nhận thao tác từ HTTP hoặc giao diện và chuyển chúng tới lớp nghiệp vụ phù hợp.
const AuthController = {
  // Điều phối sự kiện và phản hồi người dùng trong khối handleLogin.
  async handleLogin(event) {
    event.preventDefault();
    const form = event.target;
    const email = form.querySelector('#login-email').value.trim();
    const password = form.querySelector('#login-password').value;
    const remember = form.querySelector('#login-remember') && form.querySelector('#login-remember').checked;

    // Xóa lỗi của lần gửi trước để chỉ hiển thị kết quả kiểm tra hiện tại.
    AuthView.clearErrors(form);

    const validation = AuthModel.validateLoginForm({ email, password });
    // Dừng hoặc đổi hướng luồng khi dữ liệu bắt buộc chưa sẵn sàng.
    if (!validation.valid) {
      AuthView.showErrors(form, validation.errors, { email: '#login-email', password: '#login-password' });
      return;
    }

    const result = await AuthModel.login(email, password);
    // Kiểm tra kết quả từ backend và chuyển sang nhánh báo lỗi khi cần.
    if (!result.success) {
      Toast.error(result.error);
      const emailEl = form.querySelector('#login-email');
      // Kiểm tra kết quả từ backend và chuyển sang nhánh báo lỗi khi cần.
      if (emailEl) emailEl.classList.add('error');
      return;
    }

    State.set('currentUser', result.user);
    State.persist('currentUser');
    Navbar.updateAuthState(result.user);
    Toast.success(`Xin chào, ${result.user.name}!`);
    setTimeout(() => {
      // Kiểm tra trạng thái đăng nhập hoặc vai trò trước khi cho phép thao tác.
      if (result.user.role === 'admin') {
        Router.navigate('/admin');
      } else {
        const returnRoute = sessionStorage.getItem('post_login_route');
        sessionStorage.removeItem('post_login_route');
        Router.navigate(returnRoute || '/');
      }
    }, 500);
  },

  // Kiểm tra điều kiện nghiệp vụ trong khối handleRegister trước khi tiếp tục.
  async handleRegister(event) {
    event.preventDefault();
    const form = event.target;
    const data = {
      name: form.querySelector('#reg-name').value.trim(),
      email: form.querySelector('#reg-email').value.trim(),
      phone: form.querySelector('#reg-phone').value.trim(),
      password: form.querySelector('#reg-password').value,
      confirmPassword: form.querySelector('#reg-confirm').value,
      terms: form.querySelector('#reg-terms') && form.querySelector('#reg-terms').checked
    };

    AuthView.clearErrors(form);
    const validation = AuthModel.validateRegisterForm(data);
    if (!validation.valid) {
      AuthView.showErrors(form, validation.errors, {
        name: '#reg-name', email: '#reg-email', phone: '#reg-phone',
        password: '#reg-password', confirmPassword: '#reg-confirm', terms: '#reg-terms-error'
      });
      return;
    }

    const result = await AuthModel.register(data);
    if (!result.success) {
      Toast.error(result.error);
      return;
    }

    State.set('currentUser', result.user);
    State.persist('currentUser');
    Navbar.updateAuthState(result.user);
    Toast.success('Đăng ký thành công! Chào mừng bạn đến với CRTicket.');
    setTimeout(() => Router.navigate('/'), 500);
  },

  // Điều phối sự kiện và phản hồi người dùng trong khối handleLogout.
  handleLogout() {
    AuthModel.logout();
    Navbar.updateAuthState(null);
    Toast.info('Đã đăng xuất thành công.');
    Router.navigate('/');
  },

  // Điều phối sự kiện và phản hồi người dùng trong khối handleForgotPassword.
  handleForgotPassword(event) {
    event.preventDefault();
    const form = event.target;
    const email = form.querySelector('#forgot-email') && form.querySelector('#forgot-email').value.trim();
    // Dừng hoặc đổi hướng luồng khi dữ liệu bắt buộc chưa sẵn sàng.
    if (!email || !Helpers.isEmail(email)) {
      Toast.error('Vui lòng nhập email hợp lệ');
      return;
    }
    const result = AuthModel.forgotPassword(email);
    // Kiểm tra kết quả từ backend và chuyển sang nhánh báo lỗi khi cần.
    if (result.success) {
      Toast.success(result.message);
      Modal.close();
    } else {
      Toast.error(result.error);
    }
  },

  // Kiểm tra điều kiện nghiệp vụ trong khối checkAuth trước khi tiếp tục.
  checkAuth() {
    // Kiểm tra trạng thái đăng nhập hoặc vai trò trước khi cho phép thao tác.
    if (!AuthModel.isAuthenticated()) {
      Toast.warning('Vui lòng đăng nhập để tiếp tục');
      Router.navigate('/login');
      return false;
    }
    const user = State.get('currentUser');
    // Kiểm tra trạng thái đăng nhập hoặc vai trò trước khi cho phép thao tác.
    if (!user.backendUserId) {
      Toast.error('Tai khoan nay chua co ID trong database. Vui long dang xuat va dang nhap lai.');
      Router.navigate('/login');
      return false;
    }
    return true;
  },

  // Kiểm tra điều kiện nghiệp vụ trong khối requireAdmin trước khi tiếp tục.
  requireAdmin() {
    // Kiểm tra trạng thái đăng nhập hoặc vai trò trước khi cho phép thao tác.
    if (!AuthModel.isAdmin()) {
      Toast.error('Bạn không có quyền truy cập trang này');
      Router.navigate('/');
      return false;
    }
    return true;
  }
};
