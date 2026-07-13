/**
 * Mục đích: Lớp Model phía trình duyệt, chịu trách nhiệm đọc/ghi dữ liệu phim và đánh giá phim.
 */
/* CineTicket - Model phim */
// Đối tượng MovieModel đóng vai trò lớp dữ liệu của frontend MVC.
const MovieModel = {
  // Đọc và lọc dữ liệu cần thiết trong khối getAll.
  getAll(filters = {}) {
    // Dừng hoặc đổi hướng luồng khi dữ liệu bắt buộc chưa sẵn sàng.
    if (!API.catalogLoadedFromBackend) return [];
    let movies = [...API.mockData.movies];
    // Đánh giá điều kiện hiện tại để cập nhật giao diện và trạng thái đúng nhánh.
    if (filters.status) movies = movies.filter(m => m.status === filters.status);
    // Đánh giá điều kiện hiện tại để cập nhật giao diện và trạng thái đúng nhánh.
    if (filters.genre) movies = movies.filter(m => m.genre.includes(filters.genre));
    // Đánh giá điều kiện hiện tại để cập nhật giao diện và trạng thái đúng nhánh.
    if (filters.search) {
      const q = filters.search.toLowerCase();
      movies = movies.filter(m => m.title.toLowerCase().includes(q) || (m.titleEn && m.titleEn.toLowerCase().includes(q)));
    }
    // Đánh giá điều kiện hiện tại để cập nhật giao diện và trạng thái đúng nhánh.
    if (filters.rating) movies = movies.filter(m => m.rating >= parseFloat(filters.rating));
    // Đánh giá điều kiện hiện tại để cập nhật giao diện và trạng thái đúng nhánh.
    if (filters.language) movies = movies.filter(m => m.language === filters.language);
    return movies;
  },

  // Đọc và lọc dữ liệu cần thiết trong khối getById.
  getById(id) {
    // Dừng hoặc đổi hướng luồng khi dữ liệu bắt buộc chưa sẵn sàng.
    if (!API.catalogLoadedFromBackend) return null;
    return API.mockData.movies.find(m => m.id === id) || null;
  },

  // Đọc và lọc dữ liệu cần thiết trong khối getByStatus.
  getByStatus(status) {
    if (!API.catalogLoadedFromBackend) return [];
    return API.mockData.movies.filter(m => m.status === status);
  },

  // Dựng phần giao diện tương ứng trong khối getNowShowing.
  getNowShowing() { return this.getByStatus('nowShowing'); },
  // Đọc và lọc dữ liệu cần thiết trong khối getComingSoon.
  getComingSoon() { return this.getByStatus('comingSoon'); },

  // Đọc và lọc dữ liệu cần thiết trong khối search.
  search(query) {
    // Dừng hoặc đổi hướng luồng khi dữ liệu bắt buộc chưa sẵn sàng.
    if (!query || !API.catalogLoadedFromBackend) return [];
    const q = query.toLowerCase();
    return API.mockData.movies.filter(m =>
      m.title.toLowerCase().includes(q) || (m.titleEn && m.titleEn.toLowerCase().includes(q))
    );
  },

  // Đọc và lọc dữ liệu cần thiết trong khối getGenres.
  getGenres() {
    if (!API.catalogLoadedFromBackend) return [];
    const genres = new Set();
    API.mockData.movies.forEach(m => m.genre.forEach(g => genres.add(g)));
    return [...genres].sort();
  },

  // Tạo dữ liệu mới trong khối create và trả về kết quả đã chuẩn hóa.
  create(data) {
    const movie = { ...data, id: 'mv' + Helpers.generateId(), createdAt: new Date().toISOString() };
    API.mockData.movies.push(movie);
    API._save('movies');
    return { success: true, movie };
  },

  // Cập nhật trạng thái hoặc dữ liệu trong khối update.
  update(id, data) {
    const idx = API.mockData.movies.findIndex(m => m.id === id);
    // Đánh giá điều kiện hiện tại để cập nhật giao diện và trạng thái đúng nhánh.
    if (idx === -1) return { success: false };
    API.mockData.movies[idx] = { ...API.mockData.movies[idx], ...data };
    API._save('movies');
    return { success: true, movie: API.mockData.movies[idx] };
  },

  // Xử lý việc gỡ bỏ, hủy hoặc giải phóng dữ liệu trong khối delete.
  delete(id) {
    const idx = API.mockData.movies.findIndex(m => m.id === id);
    if (idx === -1) return { success: false };
    API.mockData.movies.splice(idx, 1);
    API._save('movies');
    return { success: true };
  }
};
