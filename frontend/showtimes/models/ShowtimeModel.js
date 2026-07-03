/* CineTicket - Showtime Model */
const ShowtimeModel = {
  getAll() { return [...API.mockData.showtimes]; },
  getById(id) { return API.mockData.showtimes.find(s => s.id === id) || null; },
  getByMovie(movieId) { return API.mockData.showtimes.filter(s => s.movieId === movieId); },
  getByCinema(cinemaId) { return API.mockData.showtimes.filter(s => s.cinemaId === cinemaId); },
  getByMovieAndDate(movieId, date) {
    return API.mockData.showtimes.filter(s => s.movieId === movieId && s.date === date);
  },
  getByFilters({ movieId, cinemaId, date }) {
    let items = API.mockData.showtimes;
    if (movieId) items = items.filter(s => s.movieId === movieId);
    if (cinemaId) items = items.filter(s => s.cinemaId === cinemaId);
    if (date) items = items.filter(s => s.date === date);
    return items;
  },
  getAvailableDates(movieId) {
    const dates = [...new Set(
      API.mockData.showtimes.filter(s => s.movieId === movieId).map(s => s.date)
    )].sort();
    return dates;
  },
  create(data) {
    const item = { ...data, id: `st_${Helpers.generateId()}`, createdAt: new Date().toISOString() };
    API.mockData.showtimes.push(item);
    API._save('showtimes');
    return { success: true, showtime: item };
  },
  delete(id) {
    const idx = API.mockData.showtimes.findIndex(s => s.id === id);
    if (idx === -1) return { success: false };
    API.mockData.showtimes.splice(idx, 1);
    API._save('showtimes');
    return { success: true };
  }
};
