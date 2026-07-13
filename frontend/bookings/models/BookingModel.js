/* CineTicket - Booking Model */
const BookingModel = {
  async getAll() {
    const data = await API.getAdminBookings();
    return (data.bookings || []).map((booking) => this._mapBackendBooking(booking));
  },

  async getById(id) {
    if (!id) throw new Error('Thieu ma booking');
    return API.getBookingTickets(id);
  },

  async getDetail(id) {
    return API.getAdminBookingDetail(id);
  },

  async getByUser(userId) {
    const data = await API.getUserBookings(userId || API.getBackendUserId());
    return data.bookings || [];
  },

  async create(data) {
    return API.createBooking(data);
  },

  async cancel(id) {
    return API.cancelBooking(id);
  },

  updateStatus(id, status) {
    return { success: false, error: 'Booking status is managed by backend' };
  },

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
      backend: true,
    };
  },
};
