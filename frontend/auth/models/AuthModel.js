/**
 * Mục đích: Lớp Model phía trình duyệt, chịu trách nhiệm đọc/ghi dữ liệu xác thực người dùng.
 */
/* CineTicket - Model xác thực */
// Đối tượng AuthModel đóng vai trò lớp dữ liệu của frontend MVC.
const AuthModel = {
  // Thực hiện trách nhiệm riêng của khối login.
  async login(identifier, password) {
    // Bắt đầu thao tác có thể thất bại để hiển thị phản hồi phù hợp cho người dùng.
    try {
      const data = await API.login({ identifier, password });
      return { success: true, user: this._mapBackendUser(data.user, data) };
    } catch (error) {
      return { success: false, error: error.message || 'Email hoac mat khau khong dung' };
    }
  },

  // Kiểm tra điều kiện nghiệp vụ trong khối register trước khi tiếp tục.
  async register(userData) {
    try {
      const data = await API.register(userData);
      const backendUser = this._mapBackendUser(data.user, data);
      return { success: true, user: backendUser };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Khong the dang ky. Vui long kiem tra backend dang chay.',
      };
    }
  },

  // Chuẩn hóa dữ liệu đầu vào/đầu ra trong khối _mapBackendUser.
  _mapBackendUser(user, tokens) {
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
      accessToken: tokens.accessToken || null,
      refreshToken: tokens.refreshToken || null,
    };
  },

  // Thực hiện trách nhiệm riêng của khối logout.
  logout() {
    // Thu hồi phiên ở backend (không chờ kết quả) rồi xóa trạng thái cục bộ.
    API.logoutBackend();
    State.clearUser();
  },

  // Đọc và lọc dữ liệu cần thiết trong khối getCurrentUser.
  getCurrentUser() {
    return State.get('currentUser');
  },

  // Kiểm tra điều kiện nghiệp vụ trong khối isAuthenticated trước khi tiếp tục.
  isAuthenticated() {
    return State.get('currentUser') !== null;
  },

  // Kiểm tra điều kiện nghiệp vụ trong khối isAdmin trước khi tiếp tục.
  isAdmin() {
    const user = State.get('currentUser');
    return user && user.role === 'admin';
  },

  // Gửi yêu cầu đặt lại mật khẩu; backend luôn trả thành công để không lộ email có tồn tại.
  async forgotPassword(email) {
    try {
      await API.forgotPassword(email);
      return { success: true, message: 'Nếu email tồn tại, liên kết đặt lại mật khẩu đã được gửi.' };
    } catch (error) {
      return { success: false, error: error.message || 'Không thể gửi yêu cầu đặt lại mật khẩu' };
    }
  },

  // Đặt lại mật khẩu bằng token trong email.
  async resetPassword(token, newPassword) {
    try {
      await API.resetPassword(token, newPassword);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message || 'Không thể đặt lại mật khẩu' };
    }
  },

  // Đổi mật khẩu khi đang đăng nhập; backend thu hồi mọi phiên nên cần đăng nhập lại.
  async changePassword(currentPassword, newPassword) {
    try {
      await API.changePassword(currentPassword, newPassword);
      State.clearUser();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message || 'Không thể đổi mật khẩu' };
    }
  },


  // Cập nhật trạng thái hoặc dữ liệu trong khối resetPassword.
  resetPassword(token, newPassword) {
    return { success: true, message: 'Mat khau da duoc dat lai thanh cong' };
  },

  // Kiểm tra điều kiện nghiệp vụ trong khối validateLoginForm trước khi tiếp tục.
  validateLoginForm(data) {
    const errors = {};
    // Kiểm tra kết quả từ backend và chuyển sang nhánh báo lỗi khi cần.
    if (!data.email || data.email.trim().length < 3) errors.email = 'Vui lòng nhập tên đăng nhập hoặc email';
    // Kiểm tra kết quả từ backend và chuyển sang nhánh báo lỗi khi cần.
    if (!data.password || data.password.length < 6) errors.password = 'Mat khau phai co it nhat 6 ky tu';
    return { valid: Object.keys(errors).length === 0, errors };
  },

  // Kiểm tra điều kiện nghiệp vụ trong khối validateRegisterForm trước khi tiếp tục.
  validateRegisterForm(data) {
    const errors = {};
    // Kiểm tra kết quả từ backend và chuyển sang nhánh báo lỗi khi cần.
    if (!data.name || data.name.trim().length < 2) errors.name = 'Ho ten phai co it nhat 2 ky tu';
    // Kiểm tra kết quả từ backend và chuyển sang nhánh báo lỗi khi cần.
    if (!data.email || !Helpers.isEmail(data.email)) errors.email = 'Email khong hop le';
    // Kiểm tra kết quả từ backend và chuyển sang nhánh báo lỗi khi cần.
    if (data.phone && !Helpers.isPhone(data.phone)) errors.phone = 'So dien thoai khong hop le (VD: 0901234567)';
    if (!data.password || data.password.length < 6) errors.password = 'Mat khau phai co it nhat 6 ky tu';
    // Kiểm tra kết quả từ backend và chuyển sang nhánh báo lỗi khi cần.
    if (data.password !== data.confirmPassword) errors.confirmPassword = 'Mat khau xac nhan khong khop';
    // Kiểm tra kết quả từ backend và chuyển sang nhánh báo lỗi khi cần.
    if (!data.terms) errors.terms = 'Ban can dong y voi dieu khoan su dung';
    return { valid: Object.keys(errors).length === 0, errors };
  }
};
