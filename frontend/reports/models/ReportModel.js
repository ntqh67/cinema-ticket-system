/* CineTicket - Report Model */
const ReportModel = {
  getSummary() {
    const bookings = API.mockData.bookings || [];
    const revenue = bookings.reduce((sum, item) => sum + (item.totalAmount || item.totalPrice || 0), 0);
    return {
      movies: API.mockData.movies.length,
      cinemas: API.mockData.cinemas.length,
      showtimes: API.mockData.showtimes.length,
      users: API.mockData.users.length,
      bookings: bookings.length,
      revenue
    };
  }
};
