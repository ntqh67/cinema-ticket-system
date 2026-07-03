/* CineTicket - Auth Controller */
const AuthController = {
  handleLogin(event) {
    event.preventDefault();
    const form = event.target;
    const email = form.querySelector('#login-email').value.trim();
    const password = form.querySelector('#login-password').value;
    const remember = form.querySelector('#login-remember') && form.querySelector('#login-remember').checked;

    // Clear previous errors
    AuthView.clearErrors(form);

    const validation = AuthModel.validateLoginForm({ email, password });
    if (!validation.valid) {
      AuthView.showErrors(form, validation.errors, { email: '#login-email', password: '#login-password' });
      return;
    }

    const result = AuthModel.login(email, password);
    if (!result.success) {
      Toast.error(result.error);
      const emailEl = form.querySelector('#login-email');
      if (emailEl) emailEl.classList.add('error');
      return;
    }

    State.set('currentUser', result.user);
    State.persist('currentUser');
    Navbar.updateAuthState(result.user);
    Toast.success(`Xin chào, ${result.user.name}!`);
    setTimeout(() => {
      if (result.user.role === 'admin') {
        Router.navigate('/admin');
      } else {
        Router.navigate('/');
      }
    }, 500);
  },

  handleRegister(event) {
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

    const result = AuthModel.register(data);
    if (!result.success) {
      Toast.error(result.error);
      return;
    }

    State.set('currentUser', result.user);
    State.persist('currentUser');
    Navbar.updateAuthState(result.user);
    Toast.success('Đăng ký thành công! Chào mừng bạn đến với CineTicket.');
    setTimeout(() => Router.navigate('/'), 500);
  },

  handleLogout() {
    AuthModel.logout();
    Navbar.updateAuthState(null);
    Toast.info('Đã đăng xuất thành công.');
    Router.navigate('/');
  },

  handleForgotPassword(event) {
    event.preventDefault();
    const form = event.target;
    const email = form.querySelector('#forgot-email') && form.querySelector('#forgot-email').value.trim();
    if (!email || !Helpers.isEmail(email)) {
      Toast.error('Vui lòng nhập email hợp lệ');
      return;
    }
    const result = AuthModel.forgotPassword(email);
    if (result.success) {
      Toast.success(result.message);
      Modal.close();
    } else {
      Toast.error(result.error);
    }
  },

  checkAuth() {
    if (!AuthModel.isAuthenticated()) {
      Toast.warning('Vui lòng đăng nhập để tiếp tục');
      Router.navigate('/login');
      return false;
    }
    return true;
  },

  requireAdmin() {
    if (!AuthModel.isAdmin()) {
      Toast.error('Bạn không có quyền truy cập trang này');
      Router.navigate('/');
      return false;
    }
    return true;
  }
};
