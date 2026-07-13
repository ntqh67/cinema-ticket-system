/**
 * Mục đích: Lớp Controller điều phối sự kiện giao diện và nghiệp vụ cụm rạp.
 */
/* CineTicket - Controller rạp phim */
// Lớp CinemaController nhận thao tác từ HTTP hoặc giao diện và chuyển chúng tới lớp nghiệp vụ phù hợp.
const CinemaController = {
  // Đọc và lọc dữ liệu cần thiết trong khối getAll.
  getAll() { return CinemaModel.getAll(); },
  // Đọc và lọc dữ liệu cần thiết trong khối getById.
  getById(id) { return CinemaModel.getById(id); },
  // Xử lý việc gỡ bỏ, hủy hoặc giải phóng dữ liệu trong khối handleDelete.
  handleDelete(id) {
    Modal.confirm('Bạn có chắc muốn xóa rạp này?', 'Xác Nhận Xóa', 'danger').then(confirmed => {
      // Đánh giá điều kiện hiện tại để cập nhật giao diện và trạng thái đúng nhánh.
      if (confirmed) {
        CinemaModel.delete(id);
        CinemaView.renderAdmin();
        Toast.success('Đã xóa rạp chiếu');
      }
    });
  }
};
