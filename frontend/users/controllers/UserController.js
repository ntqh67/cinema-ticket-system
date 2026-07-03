/* CineTicket - User Controller */
const UserController = {
  handleUpdateProfile(event) {
    event.preventDefault();
    if (!AuthController.checkAuth()) return;
    const form = event.target;
    const user = State.get('currentUser');
    const name = form.querySelector('#profile-name').value.trim();
    const phone = form.querySelector('#profile-phone').value.trim();
    if (!name || name.length < 2) {
      Toast.error('Ho ten phai co it nhat 2 ky tu');
      return;
    }
    if (phone && !Helpers.isPhone(phone)) {
      Toast.error('So dien thoai khong hop le');
      return;
    }
    const result = UserModel.update(user.id, { name, phone });
    if (result.success) Toast.success('Cap nhat thong tin thanh cong');
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
