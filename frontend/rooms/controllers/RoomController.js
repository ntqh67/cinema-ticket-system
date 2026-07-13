/**
 * Mục đích: Lớp Controller điều phối sự kiện giao diện và nghiệp vụ phòng chiếu.
 */
/* CineTicket - Controller phòng chiếu */
// Lớp RoomController nhận thao tác từ HTTP hoặc giao diện và chuyển chúng tới lớp nghiệp vụ phù hợp.
const RoomController = {
  // Đọc và lọc dữ liệu cần thiết trong khối getAll.
  getAll() { return RoomModel.getAll(); },
  // Đọc và lọc dữ liệu cần thiết trong khối getByCinema.
  getByCinema(cinemaId) { return RoomModel.getByCinema(cinemaId); },
  // Xử lý việc gỡ bỏ, hủy hoặc giải phóng dữ liệu trong khối handleDelete.
  handleDelete(id) {
    Modal.confirm('Xóa phòng chiếu này?', 'Xác Nhận', 'danger').then(ok => {
      // Kiểm tra trạng thái đăng nhập hoặc vai trò trước khi cho phép thao tác.
      if (ok) { RoomModel.delete(id); RoomView.renderAdmin(); Toast.success('Đã xóa phòng chiếu'); }
    });
  }
};
