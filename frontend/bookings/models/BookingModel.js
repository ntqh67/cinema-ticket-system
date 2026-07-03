/* CineTicket - Booking Model */
const BookingModel = {
  getAll() { return [...API.mockData.bookings]; },
  getById(id) { return API.mockData.bookings.find(b => b.id === id) || null; },
  getByUser(userId) { return API.mockData.bookings.filter(b => b.userId === userId); },
  create(data) {
    const booking = {
      ...data,
      id: 'bk' + Helpers.generateId(),
      status: 'confirmed',
      createdAt: new Date().toISOString()
    };
    API.mockData.bookings.push(booking);
    API._save('bookings');
    // Update showtime booked seats count
    const showtime = API.mockData.showtimes.find(s => s.id === data.showtimeId);
    if (showtime && data.seats) {
      showtime.bookedSeats = (showtime.bookedSeats || 0) + data.seats.length;
      API._save('showtimes');
    }
    return { success: true, booking };
  },
  cancel(id) {
    const idx = API.mockData.bookings.findIndex(b => b.id === id);
    if (idx === -1) return { success: false };
    API.mockData.bookings[idx].status = 'cancelled';
    API._save('bookings');
    return { success: true };
  },
  updateStatus(id, status) {
    const idx = API.mockData.bookings.findIndex(b => b.id === id);
    if (idx === -1) return { success: false };
    API.mockData.bookings[idx].status = status;
    API._save('bookings');
    return { success: true };
  }
};
