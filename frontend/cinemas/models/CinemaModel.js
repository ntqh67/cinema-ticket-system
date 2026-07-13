/**
 * Mục đích: Lớp Model phía trình duyệt, chịu trách nhiệm đọc/ghi dữ liệu cụm rạp.
 */
/* CineTicket - Model rạp phim */
// Đối tượng CinemaModel đóng vai trò lớp dữ liệu của frontend MVC.
const CinemaModel = {
  // Đọc và lọc dữ liệu cần thiết trong khối getAll.
  getAll() { return [...API.mockData.cinemas]; },
  // Đọc và lọc dữ liệu cần thiết trong khối getById.
  getById(id) { return API.mockData.cinemas.find(c => c.id === id) || null; },
  // Đọc và lọc dữ liệu cần thiết trong khối getChains.
  getChains() {
    const chains = new Map();
    API.mockData.cinemas.forEach((cinema) => {
      const chainId = cinema.chainId || (cinema.chain && cinema.chain.id) || cinema.id;
      const chainName = cinema.chain && cinema.chain.name ? cinema.chain.name : cinema.name;
      // Dừng hoặc đổi hướng luồng khi dữ liệu bắt buộc chưa sẵn sàng.
      if (!chains.has(chainId)) chains.set(chainId, { id: chainId, name: chainName });
    });
    return [...chains.values()].sort((a, b) => a.name.localeCompare(b.name));
  },
  // Đọc và lọc dữ liệu cần thiết trong khối getByCity.
  getByCity(city) { return API.mockData.cinemas.filter(c => c.city === city); },
  // Đọc và lọc dữ liệu cần thiết trong khối getCities.
  getCities() { return [...new Set(API.mockData.cinemas.map(c => c.city))]; },
  // Tạo dữ liệu mới trong khối create và trả về kết quả đã chuẩn hóa.
  create(data) {
    const item = { ...data, id: 'ci' + Helpers.generateId(), createdAt: new Date().toISOString() };
    API.mockData.cinemas.push(item);
    API._save('cinemas');
    return { success: true, cinema: item };
  },
  // Cập nhật trạng thái hoặc dữ liệu trong khối update.
  update(id, data) {
    const idx = API.mockData.cinemas.findIndex(c => c.id === id);
    // Đánh giá điều kiện hiện tại để cập nhật giao diện và trạng thái đúng nhánh.
    if (idx === -1) return { success: false };
    API.mockData.cinemas[idx] = { ...API.mockData.cinemas[idx], ...data };
    API._save('cinemas');
    return { success: true };
  },
  // Xử lý việc gỡ bỏ, hủy hoặc giải phóng dữ liệu trong khối delete.
  delete(id) {
    const idx = API.mockData.cinemas.findIndex(c => c.id === id);
    if (idx === -1) return { success: false };
    API.mockData.cinemas.splice(idx, 1);
    API._save('cinemas');
    return { success: true };
  }
};
