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

  handleChangePassword(event) {
    event.preventDefault();
    if (!AuthController.checkAuth()) return;
    const form = event.target;
    const user = State.get('currentUser');
    const current = form.querySelector('#pwd-current').value;
    const newPwd = form.querySelector('#pwd-new').value;
    const confirm = form.querySelector('#pwd-confirm').value;
    if (newPwd !== confirm) {
      Toast.error('Mat khau xac nhan khong khop');
      return;
    }
    const result = UserModel.changePassword(user.id, current, newPwd);
    if (result.success) {
      Toast.success(result.message);
      form.reset();
    } else {
      Toast.error(result.error);
    }
  },

  async loadBookingHistory() {
    return TicketModel.getByUser(API.getBackendUserId());
  },
};
