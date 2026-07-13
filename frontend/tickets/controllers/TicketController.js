/**
 * Mục đích: Lớp Controller điều phối sự kiện giao diện và nghiệp vụ vé điện tử.
 */
/* CineTicket - Controller vé */
// Lớp TicketController nhận thao tác từ HTTP hoặc giao diện và chuyển chúng tới lớp nghiệp vụ phù hợp.
const TicketController = {
  // Đọc và lọc dữ liệu cần thiết trong khối getTicket.
  getTicket(bookingId) {
    return TicketModel.getByBookingId(bookingId);
  },

  // Kiểm tra điều kiện nghiệp vụ trong khối handleCheckIn trước khi tiếp tục.
  async handleCheckIn(qrToken) {
    // Bắt đầu thao tác có thể thất bại để hiển thị phản hồi phù hợp cho người dùng.
    try {
      const currentUser = State.get('currentUser');
      const data = await API.checkInTicket(qrToken, {
        checkedInBy: currentUser ? currentUser.email : 'staff',
      });
      Toast.success('Check-in ve thanh cong');
      TicketView._renderBackendTicket(data.ticket);
    } catch (error) {
      Toast.error(error.message || 'Khong the check-in ve');
    }
  },
};
