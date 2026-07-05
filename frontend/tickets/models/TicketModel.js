/* CineTicket - Ticket Model */
const TicketModel = {
  getByBookingId(bookingId) {
    return null;
  },

  async getByUser(userId) {
    const data = await API.getUserTickets(userId || API.getBackendUserId());
    return data.tickets;
  },

  generateQRData(booking) {
    return booking.qrToken || `CINETICKET:${booking.id}:${booking.userId}`;
  },
};
