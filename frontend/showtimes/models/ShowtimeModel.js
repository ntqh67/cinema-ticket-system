/**
 * Mục đích: Lớp Model phía trình duyệt, chịu trách nhiệm đọc/ghi dữ liệu suất chiếu.
 */
/* CineTicket - Model suất chiếu */
// Đối tượng ShowtimeModel đóng vai trò lớp dữ liệu của frontend MVC.
const ShowtimeModel = {
  // Đọc và lọc dữ liệu cần thiết trong khối getAll.
  getAll() { return API.catalogLoadedFromBackend ? [...API.mockData.showtimes] : []; },
  // Đọc và lọc dữ liệu cần thiết trong khối getById.
  getById(id) { return API.catalogLoadedFromBackend ? API.mockData.showtimes.find(s => s.id === id) || null : null; },
  // Đọc và lọc dữ liệu cần thiết trong khối getByMovie.
  getByMovie(movieId) { return API.catalogLoadedFromBackend ? API.mockData.showtimes.filter(s => s.movieId === movieId) : []; },
  // Đọc và lọc dữ liệu cần thiết trong khối getByCinema.
  getByCinema(cinemaId) { return API.catalogLoadedFromBackend ? API.mockData.showtimes.filter(s => s.cinemaId === cinemaId) : []; },
  // Đọc và lọc dữ liệu cần thiết trong khối getByChain.
  getByChain(chainId) { return API.catalogLoadedFromBackend ? API.mockData.showtimes.filter(s => s.chainId === chainId) : []; },
  // Đọc và lọc dữ liệu cần thiết trong khối getByMovieAndDate.
  getByMovieAndDate(movieId, date) {
    // Dừng hoặc đổi hướng luồng khi dữ liệu bắt buộc chưa sẵn sàng.
    if (!API.catalogLoadedFromBackend) return [];
    return API.mockData.showtimes.filter(s => s.movieId === movieId && s.date === date);
  },
  // Đọc và lọc dữ liệu cần thiết trong khối getByFilters.
  getByFilters({ movieId, cinemaId, chainId, date }) {
    if (!API.catalogLoadedFromBackend) return [];
    let items = API.mockData.showtimes;
    // Đánh giá điều kiện hiện tại để cập nhật giao diện và trạng thái đúng nhánh.
    if (movieId) items = items.filter(s => s.movieId === movieId);
    // Đánh giá điều kiện hiện tại để cập nhật giao diện và trạng thái đúng nhánh.
    if (chainId) items = items.filter(s => s.chainId === chainId);
    // Đánh giá điều kiện hiện tại để cập nhật giao diện và trạng thái đúng nhánh.
    if (cinemaId) items = items.filter(s => s.cinemaId === cinemaId);
    // Đánh giá điều kiện hiện tại để cập nhật giao diện và trạng thái đúng nhánh.
    if (date) items = items.filter(s => s.date === date);
    return items;
  },
  // Đọc và lọc dữ liệu cần thiết trong khối getAvailableDates.
  getAvailableDates(movieId) {
    if (!API.catalogLoadedFromBackend) return [];
    const dates = [...new Set(
      API.mockData.showtimes.filter(s => s.movieId === movieId).map(s => s.date)
    )].sort();
    return dates;
  },
  // Tạo dữ liệu mới trong khối create và trả về kết quả đã chuẩn hóa.
  create(data) {
    return API.createAdminShowtime(data);
  },
  // Xử lý việc gỡ bỏ, hủy hoặc giải phóng dữ liệu trong khối delete.
  delete(id) {
    const idx = API.mockData.showtimes.findIndex(s => s.id === id);
    // Đánh giá điều kiện hiện tại để cập nhật giao diện và trạng thái đúng nhánh.
    if (idx === -1) return { success: false };
    API.mockData.showtimes.splice(idx, 1);
    API._save('showtimes');
    return { success: true };
  }
};
