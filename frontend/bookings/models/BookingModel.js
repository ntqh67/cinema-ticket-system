/**
 * Mục đích: Lớp Model phía trình duyệt, chịu trách nhiệm đọc/ghi dữ liệu đặt vé, thanh toán và vé điện tử.
 */
/* CineTicket - Model đặt vé */
// Đối tượng BookingModel đóng vai trò lớp dữ liệu của frontend MVC.
const BookingModel = {
  // Đọc và lọc dữ liệu cần thiết trong khối getAll.
  async getAll() {
    const overview = await this.getOverview();
    return overview.bookings;
  },

  // Đọc và lọc dữ liệu cần thiết trong khối getOverview.
  async getOverview() {
    const data = await API.getAdminBookings();
    const bookings = (data.bookings || []).map((booking) => this._mapBackendBooking(booking));
    return {
      bookings,
      summary: this._summarize(bookings),
    };
  },

  // Đọc và lọc dữ liệu cần thiết trong khối getById.
  async getById(id) {
    // Kiểm tra trạng thái booking hoặc thanh toán để chọn bước giao diện tiếp theo.
    if (!id) throw new Error('Thieu ma booking');
    return API.getBookingTickets(id);
  },

  // Đọc và lọc dữ liệu cần thiết trong khối getDetail.
  async getDetail(id) {
    return API.getAdminBookingDetail(id);
  },

  // Đọc và lọc dữ liệu cần thiết trong khối getByUser.
  async getByUser(userId) {
    const data = await API.getUserBookings(userId || API.getBackendUserId());
    return data.bookings || [];
  },

  // Tạo dữ liệu mới trong khối create và trả về kết quả đã chuẩn hóa.
  async create(data) {
    return API.createBooking(data);
  },

  // Kiểm tra điều kiện nghiệp vụ trong khối cancel trước khi tiếp tục.
  async cancel(id) {
    return API.cancelBooking(id);
  },

  // Cập nhật trạng thái hoặc dữ liệu trong khối updateStatus.
  updateStatus(id, status) {
    return { success: false, error: 'Booking status is managed by backend' };
  },

  // Thực hiện trách nhiệm riêng của khối _summarize.
  _summarize(bookings) {
    const status = {};
    const providers = {};
    let totalValue = 0;
    let paidRevenue = 0;

    bookings.forEach((booking) => {
      const amount = Number(booking.totalAmount || 0);
      totalValue += amount;
      status[booking.status] ||= { count: 0, amount: 0 };
      status[booking.status].count += 1;
      status[booking.status].amount += amount;

      // Kiểm tra trạng thái booking hoặc thanh toán để chọn bước giao diện tiếp theo.
      if (booking.status === 'paid') {
        paidRevenue += amount;
        const provider = booking.paymentProvider || 'unknown';
        providers[provider] ||= { provider, count: 0, amount: 0 };
        providers[provider].count += 1;
        providers[provider].amount += amount;
      }
    });

    return {
      totalBookings: bookings.length,
      totalValue,
      paidRevenue,
      status,
      paymentProviders: Object.values(providers),
    };
  },

  // Chuẩn hóa dữ liệu đầu vào/đầu ra trong khối _mapBackendBooking.
  _mapBackendBooking(booking) {
    const status = String(booking.status || '').toLowerCase();
    return {
      id: booking.id,
      userId: booking.user && booking.user.id,
      userName: booking.user && booking.user.name,
      userEmail: booking.user && booking.user.email,
      movieId: booking.movie && booking.movie.id,
      movieTitle: booking.movie && booking.movie.title,
      showtimeId: booking.showtime && booking.showtime.id,
      cinemaName: booking.cinema && booking.cinema.name,
      roomName: booking.room && booking.room.name,
      seats: (booking.seats || []).map((seat) => ({
        id: `${seat.row}${seat.number}`,
        type: String(seat.type || '').toLowerCase(),
      })),
      totalAmount: booking.totalAmount,
      currency: booking.currency,
      status,
      expiresAt: booking.expiresAt,
      createdAt: booking.createdAt,
      ticketCount: booking.ticketCount || 0,
      paymentProvider: booking.payments?.[0]?.provider || null,
      paymentStatus: booking.payments?.[0]?.status || null,
      backend: true,
    };
  },
};
