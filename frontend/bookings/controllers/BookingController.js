/**
 * Mục đích: Lớp Controller điều phối sự kiện giao diện và nghiệp vụ đặt vé, thanh toán và vé điện tử.
 */
/* CineTicket - Controller đặt vé */
// Lớp BookingController nhận thao tác từ HTTP hoặc giao diện và chuyển chúng tới lớp nghiệp vụ phù hợp.
const BookingController = {
  // Đọc và lọc dữ liệu cần thiết trong khối getAll.
  getAll() {
    return BookingModel.getAll();
  },

  // Đọc và lọc dữ liệu cần thiết trong khối getById.
  getById(id) {
    return BookingModel.getById(id);
  },

  // Đọc và lọc dữ liệu cần thiết trong khối getByUser.
  getByUser(userId) {
    return BookingModel.getByUser(userId);
  },

  // Kiểm tra điều kiện nghiệp vụ trong khối handleCancel trước khi tiếp tục.
  handleCancel(id) {
    Modal.confirm('Bạn có chắc muốn hủy đặt vé này?', 'Hủy Đặt Vé', 'danger').then((ok) => {
      // Dừng hoặc đổi hướng luồng khi dữ liệu bắt buộc chưa sẵn sàng.
      if (!ok) return;

      BookingModel.cancel(id)
        .then(() => {
          Toast.success('Đã hủy đặt vé');
          // Kiểm tra trạng thái đăng nhập hoặc vai trò trước khi cho phép thao tác.
          if (location.hash.includes('/admin/bookings')) {
            BookingView.renderAdmin();
          } else {
            Router.navigate('/history');
          }
        })
        .catch((error) => {
          Toast.error(error.message || 'Không thể hủy đặt vé');
        });
    });
  },
};
