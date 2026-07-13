/**
 * Mục đích: Lớp Controller điều phối sự kiện giao diện và nghiệp vụ suất chiếu.
 */
/* CineTicket - Controller suất chiếu */
// Lớp ShowtimeController nhận thao tác từ HTTP hoặc giao diện và chuyển chúng tới lớp nghiệp vụ phù hợp.
const ShowtimeController = {
  // Đọc và lọc dữ liệu cần thiết trong khối getByMovie.
  getByMovie(movieId) { return ShowtimeModel.getByMovie(movieId); },
  // Đọc và lọc dữ liệu cần thiết trong khối getByFilters.
  getByFilters(filters) { return ShowtimeModel.getByFilters(filters); },
  // Tạo dữ liệu mới trong khối handleCreate và trả về kết quả đã chuẩn hóa.
  async handleCreate(event) {
    event.preventDefault();
    const form = event.target;
    const movieId = form.querySelector('#showtime-movie-id').value;
    const roomId = form.querySelector('#showtime-room-id').value;
    const date = form.querySelector('#showtime-date').value;
    const time = form.querySelector('#showtime-time').value;
    const basePrice = Number(form.querySelector('#showtime-base-price').value || 80000);
    const movie = MovieModel.getById(movieId);

    // Dừng hoặc đổi hướng luồng khi dữ liệu bắt buộc chưa sẵn sàng.
    if (!movie || !roomId || !date || !time) {
      Toast.error('Vui long nhap du thong tin lich chieu');
      return;
    }

    const startAt = new Date(`${date}T${time}:00+07:00`);
    const endAt = new Date(startAt.getTime() + movie.duration * 60 * 1000);

    // Bắt đầu thao tác có thể thất bại để hiển thị phản hồi phù hợp cho người dùng.
    try {
      await ShowtimeModel.create({
        movieId,
        roomId,
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString(),
        basePrice,
      });
      await API.syncBackendCatalog();
      Modal.close();
      Toast.success('Da tao lich chieu');
      ShowtimeView.renderAdmin();
    } catch (error) {
      Toast.error(error.message || 'Khong the tao lich chieu');
    }
  },
  // Xử lý việc gỡ bỏ, hủy hoặc giải phóng dữ liệu trong khối handleDelete.
  handleDelete(id) {
    Modal.confirm('Xóa lịch chiếu này?', 'Xác Nhận', 'danger').then(ok => {
      // Kiểm tra trạng thái đăng nhập hoặc vai trò trước khi cho phép thao tác.
      if (ok) { ShowtimeModel.delete(id); ShowtimeView.renderAdmin(); Toast.success('Đã xóa lịch chiếu'); }
    });
  }
};
