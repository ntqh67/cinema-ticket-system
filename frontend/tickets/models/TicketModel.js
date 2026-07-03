/* CineTicket - Ticket Model */
const TicketModel = {
  getByBookingId(bookingId) {
    return API.mockData.bookings.find(b => b.id === bookingId) || null;
  },
  generateQRData(booking) {
    return `CINETICKET:${booking.id}:${booking.userId}`;
  }
};
