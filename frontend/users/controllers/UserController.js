/* CineTicket - User Controller */
const UserController = {
  async handleUpdateProfile(event) {
    event.preventDefault();
    if (!AuthController.checkAuth()) return;
    const form = event.target;
    const user = State.get('currentUser');
    const name = form.querySelector('#profile-name').value.trim();
    const phone = form.querySelector('#profile-phone').value.trim();
    if (!name || name.length < 2) {
      Toast.error('Họ tên phải có ít nhất 2 ký tự');
      return;
    }
    if (phone && !Helpers.isPhone(phone)) {
      Toast.error('Số điện thoại không hợp lệ');
      return;
    }
    const result = await UserModel.update(user.backendUserId || user.id, { name, phone: phone || undefined });
    if (result.success) Toast.success('Cập nhật thông tin thành công');
    else Toast.error(result.error);
  },

  // Đổi mật khẩu qua backend; thành công thì mọi phiên bị thu hồi nên phải đăng nhập lại.
  async handleChangePassword(event) {
    event.preventDefault();
    if (!AuthController.checkAuth()) return;
    const form = event.target;
    const current = form.querySelector('#pwd-current').value;
    const newPwd = form.querySelector('#pwd-new').value;
    const confirm = form.querySelector('#pwd-confirm').value;
    if (newPwd.length < 6) {
      Toast.error('Mật khẩu mới phải có ít nhất 6 ký tự');
      return;
    }
    if (newPwd !== confirm) {
      Toast.error('Mật khẩu xác nhận không khớp');
      return;
    }
    const result = await AuthModel.changePassword(current, newPwd);
    if (result.success) {
      Toast.success('Đổi mật khẩu thành công. Vui lòng đăng nhập lại.');
      Router.navigate('/login');
    } else {
      Toast.error(result.error);
    }
  },

  async loadBookingHistory() {
    return TicketModel.getByUser(API.getBackendUserId());
  },
};
