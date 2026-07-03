/* CineTicket - Auth Model */
const AuthModel = {
  login(email, password) {
    const users = API.mockData.users;
    const user = users.find(u => u.email === email && u.password === password);
    if (!user) return { success: false, error: 'Email hoặc mật khẩu không đúng' };
    if (!user.isActive) return { success: false, error: 'Tài khoản đã bị vô hiệu hóa' };
    const { password: _p, ...safeUser } = user;
    return { success: true, user: safeUser };
  },

  register(userData) {
    const users = API.mockData.users;
    if (users.find(u => u.email === userData.email)) {
      return { success: false, error: 'Email này đã được sử dụng' };
    }
    if (userData.phone && users.find(u => u.phone === userData.phone)) {
      return { success: false, error: 'Số điện thoại này đã được đăng ký' };
    }
    const newUser = {
      id: Helpers.generateId(),
      name: userData.name,
      email: userData.email,
      phone: userData.phone || '',
      password: userData.password,
      role: 'user',
      avatar: null,
      createdAt: new Date().toISOString(),
      isActive: true
    };
    API.mockData.users.push(newUser);
    API._save('users');
    const { password: _pw, ...safeUser } = newUser;
    return { success: true, user: safeUser };
  },

  logout() {
    State.clearUser();
  },

  getCurrentUser() {
    return State.get('currentUser');
  },

  isAuthenticated() {
    return State.get('currentUser') !== null;
  },

  isAdmin() {
    const user = State.get('currentUser');
    return user && user.role === 'admin';
  },

  forgotPassword(email) {
    const user = API.mockData.users.find(u => u.email === email);
    if (!user) return { success: false, error: 'Email không tồn tại trong hệ thống' };
    return { success: true, message: 'Đã gửi link đặt lại mật khẩu vào email của bạn' };
  },

  resetPassword(token, newPassword) {
    return { success: true, message: 'Mật khẩu đã được đặt lại thành công' };
  },

  validateLoginForm(data) {
    const errors = {};
    if (!data.email || !Helpers.isEmail(data.email)) errors.email = 'Email không hợp lệ';
    if (!data.password || data.password.length < 6) errors.password = 'Mật khẩu phải có ít nhất 6 ký tự';
    return { valid: Object.keys(errors).length === 0, errors };
  },

  validateRegisterForm(data) {
    const errors = {};
    if (!data.name || data.name.trim().length < 2) errors.name = 'Họ tên phải có ít nhất 2 ký tự';
    if (!data.email || !Helpers.isEmail(data.email)) errors.email = 'Email không hợp lệ';
    if (data.phone && !Helpers.isPhone(data.phone)) errors.phone = 'Số điện thoại không hợp lệ (VD: 0901234567)';
    if (!data.password || data.password.length < 6) errors.password = 'Mật khẩu phải có ít nhất 6 ký tự';
    if (data.password !== data.confirmPassword) errors.confirmPassword = 'Mật khẩu xác nhận không khớp';
    if (!data.terms) errors.terms = 'Bạn cần đồng ý với điều khoản sử dụng';
    return { valid: Object.keys(errors).length === 0, errors };
  }
};
