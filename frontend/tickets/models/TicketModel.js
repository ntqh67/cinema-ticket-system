/* CineTicket - Ticket Model */
const TicketModel = {
  async getByBookingId(bookingId) {
    if (!bookingId) throw new Error('Thieu ma booking');
    return API.getBookingTickets(bookingId);
  },

  async getByUser(userId) {
    const data = await API.getUserTickets(userId || API.getBackendUserId());
    return data.tickets;
  },

  generateQRData(booking) {
    return booking.qrToken || `CINETICKET:${booking.id}:${booking.userId}`;
  },
};
