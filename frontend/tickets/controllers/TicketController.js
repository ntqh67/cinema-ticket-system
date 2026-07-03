/* CineTicket - Ticket Controller */
const TicketController = {
  getTicket(bookingId) { return TicketModel.getByBookingId(bookingId); }
};
