/**
 * Mục đích: Lớp Model phía trình duyệt, chịu trách nhiệm đọc/ghi dữ liệu vé điện tử.
 */
/* CineTicket - Model vé */
// Đối tượng TicketModel đóng vai trò lớp dữ liệu của frontend MVC.
const TicketModel = {
  // Đọc và lọc dữ liệu cần thiết trong khối getByBookingId.
  async getByBookingId(bookingId) {
    // Kiểm tra trạng thái booking hoặc thanh toán để chọn bước giao diện tiếp theo.
    if (!bookingId) throw new Error('Thieu ma booking');
    return API.getBookingTickets(bookingId);
  },

  // Đọc và lọc dữ liệu cần thiết trong khối getByUser.
  async getByUser(userId) {
    const data = await API.getUserTickets(userId || API.getBackendUserId());
    return data.tickets;
  },

  // Tạo dữ liệu mới trong khối generateQRData và trả về kết quả đã chuẩn hóa.
  generateQRData(booking) {
    return booking.qrToken || `CINETICKET:${booking.id}:${booking.userId}`;
  },
};
