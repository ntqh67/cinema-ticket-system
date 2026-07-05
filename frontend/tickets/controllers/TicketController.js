/* CineTicket - Ticket Controller */
const TicketController = {
  getTicket(bookingId) {
    return TicketModel.getByBookingId(bookingId);
  },

  async handleCheckIn(qrToken) {
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
