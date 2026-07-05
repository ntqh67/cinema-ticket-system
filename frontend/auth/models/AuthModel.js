/* CineTicket - Auth Model */
const AuthModel = {
  async login(email, password) {
    try {
      const data = await API.login({ email, password });
      return { success: true, user: this._mapBackendUser(data.user) };
    } catch (error) {
      return { success: false, error: error.message || 'Email hoac mat khau khong dung' };
    }
  },

  async register(userData) {
    try {
      const data = await API.register(userData);
      const backendUser = this._mapBackendUser(data.user);
      return { success: true, user: backendUser };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Khong the dang ky. Vui long kiem tra backend dang chay.',
      };
    }
  },

  _mapBackendUser(user) {
    return {
      id: user.id,
      backendUserId: user.backendUserId || user.id,
      name: user.name || user.email,
      email: user.email,
      phone: user.phone || '',
      role: user.role || 'user',
      avatar: null,
      createdAt: user.createdAt || new Date().toISOString(),
      isActive: user.isActive !== false,
    };
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
    if (!user) return { success: false, error: 'Email khong ton tai trong he thong' };
    return { success: true, message: 'Da gui link dat lai mat khau vao email cua ban' };
  },

  resetPassword(token, newPassword) {
    return { success: true, message: 'Mat khau da duoc dat lai thanh cong' };
  },

  validateLoginForm(data) {
    const errors = {};
    if (!data.email || !Helpers.isEmail(data.email)) errors.email = 'Email khong hop le';
    if (!data.password || data.password.length < 6) errors.password = 'Mat khau phai co it nhat 6 ky tu';
    return { valid: Object.keys(errors).length === 0, errors };
  },

  validateRegisterForm(data) {
    const errors = {};
    if (!data.name || data.name.trim().length < 2) errors.name = 'Ho ten phai co it nhat 2 ky tu';
    if (!data.email || !Helpers.isEmail(data.email)) errors.email = 'Email khong hop le';
    if (data.phone && !Helpers.isPhone(data.phone)) errors.phone = 'So dien thoai khong hop le (VD: 0901234567)';
    if (!data.password || data.password.length < 6) errors.password = 'Mat khau phai co it nhat 6 ky tu';
    if (data.password !== data.confirmPassword) errors.confirmPassword = 'Mat khau xac nhan khong khop';
    if (!data.terms) errors.terms = 'Ban can dong y voi dieu khoan su dung';
    return { valid: Object.keys(errors).length === 0, errors };
  }
};
