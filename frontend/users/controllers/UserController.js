/**
 * Mục đích: Lớp Controller điều phối sự kiện giao diện và nghiệp vụ người dùng.
 */
/* CineTicket - Controller người dùng */
// Lớp UserController nhận thao tác từ HTTP hoặc giao diện và chuyển chúng tới lớp nghiệp vụ phù hợp.
const UserController = {
  // Cập nhật trạng thái hoặc dữ liệu trong khối handleUpdateProfile.
  handleUpdateProfile(event) {
    event.preventDefault();
    // Kiểm tra trạng thái đăng nhập hoặc vai trò trước khi cho phép thao tác.
    if (!AuthController.checkAuth()) return;
    const form = event.target;
    const user = State.get('currentUser');
    const name = form.querySelector('#profile-name').value.trim();
    const phone = form.querySelector('#profile-phone').value.trim();
    // Xử lý riêng trường hợp danh sách rỗng hoặc có số lượng không hợp lệ.
    if (!name || name.length < 2) {
      Toast.error('Ho ten phai co it nhat 2 ky tu');
      return;
    }
    // Dừng hoặc đổi hướng luồng khi dữ liệu bắt buộc chưa sẵn sàng.
    if (phone && !Helpers.isPhone(phone)) {
      Toast.error('So dien thoai khong hop le');
      return;
    }
    const result = UserModel.update(user.id, { name, phone });
    // Kiểm tra kết quả từ backend và chuyển sang nhánh báo lỗi khi cần.
    if (result.success) Toast.success('Cap nhat thong tin thanh cong');
    else Toast.error(result.error);
  },

  // Điều phối sự kiện và phản hồi người dùng trong khối handleChangePassword.
  handleChangePassword(event) {
    event.preventDefault();
    if (!AuthController.checkAuth()) return;
    const form = event.target;
    const user = State.get('currentUser');
    const current = form.querySelector('#pwd-current').value;
    const newPwd = form.querySelector('#pwd-new').value;
    const confirm = form.querySelector('#pwd-confirm').value;
    // Dừng hoặc đổi hướng luồng khi dữ liệu bắt buộc chưa sẵn sàng.
    if (newPwd !== confirm) {
      Toast.error('Mat khau xac nhan khong khop');
      return;
    }
    const result = UserModel.changePassword(user.id, current, newPwd);
    // Kiểm tra kết quả từ backend và chuyển sang nhánh báo lỗi khi cần.
    if (result.success) {
      Toast.success(result.message);
      form.reset();
    } else {
      Toast.error(result.error);
    }
  },

  // Kiểm tra điều kiện nghiệp vụ trong khối loadBookingHistory trước khi tiếp tục.
  async loadBookingHistory() {
    return TicketModel.getByUser(API.getBackendUserId());
  },
};
