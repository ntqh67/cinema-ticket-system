/**
 * Mục đích: Lớp Model phía trình duyệt, chịu trách nhiệm đọc/ghi dữ liệu phòng chiếu.
 */
/* CineTicket - Model phòng chiếu */
// Đối tượng RoomModel đóng vai trò lớp dữ liệu của frontend MVC.
const RoomModel = {
  // Đọc và lọc dữ liệu cần thiết trong khối getAll.
  getAll() { return [...API.mockData.rooms]; },
  // Đọc và lọc dữ liệu cần thiết trong khối getById.
  getById(id) { return API.mockData.rooms.find(r => r.id === id) || null; },
  // Đọc và lọc dữ liệu cần thiết trong khối getByCinema.
  getByCinema(cinemaId) { return API.mockData.rooms.filter(r => r.cinemaId === cinemaId); },
  // Tạo dữ liệu mới trong khối create và trả về kết quả đã chuẩn hóa.
  create(data) {
    const item = { ...data, id: 'rm' + Helpers.generateId() };
    API.mockData.rooms.push(item);
    API._save('rooms');
    return { success: true, room: item };
  },
  // Xử lý việc gỡ bỏ, hủy hoặc giải phóng dữ liệu trong khối delete.
  delete(id) {
    const idx = API.mockData.rooms.findIndex(r => r.id === id);
    // Đánh giá điều kiện hiện tại để cập nhật giao diện và trạng thái đúng nhánh.
    if (idx === -1) return { success: false };
    API.mockData.rooms.splice(idx, 1);
    API._save('rooms');
    return { success: true };
  }
};
