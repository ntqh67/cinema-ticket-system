/* CineTicket - Booking Model */
const BookingModel = {
  getAll() {
    return [...API.mockData.bookings];
  },

  getById(id) {
    return API.mockData.bookings.find((booking) => booking.id === id) || null;
  },

  getByUser(userId) {
    const backendUserId = API.getBackendUserId();
    return API.mockData.bookings.filter((booking) =>
      booking.userId === userId || booking.userId === backendUserId
    );
  },

  async create(data) {
    return API.createBooking(data);
  },

  cancel(id) {
    const idx = API.mockData.bookings.findIndex((booking) => booking.id === id);
    if (idx === -1) return { success: false };
    API.mockData.bookings[idx].status = 'cancelled';
    API._save('bookings');
    return { success: true };
  },

  updateStatus(id, status) {
    const idx = API.mockData.bookings.findIndex((booking) => booking.id === id);
    if (idx === -1) return { success: false };
    API.mockData.bookings[idx].status = status;
    API._save('bookings');
    return { success: true };
  },
};
