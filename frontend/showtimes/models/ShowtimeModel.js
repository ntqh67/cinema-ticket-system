/* CineTicket - Showtime Model */
const ShowtimeModel = {
  getAll() { return API.catalogLoadedFromBackend ? [...API.mockData.showtimes] : []; },
  getById(id) { return API.catalogLoadedFromBackend ? API.mockData.showtimes.find(s => s.id === id) || null : null; },
  getByMovie(movieId) { return API.catalogLoadedFromBackend ? API.mockData.showtimes.filter(s => s.movieId === movieId) : []; },
  getByCinema(cinemaId) { return API.catalogLoadedFromBackend ? API.mockData.showtimes.filter(s => s.cinemaId === cinemaId) : []; },
  getByChain(chainId) { return API.catalogLoadedFromBackend ? API.mockData.showtimes.filter(s => s.chainId === chainId) : []; },
  getByMovieAndDate(movieId, date) {
    if (!API.catalogLoadedFromBackend) return [];
    return API.mockData.showtimes.filter(s => s.movieId === movieId && s.date === date);
  },
  getByFilters({ movieId, cinemaId, chainId, date }) {
    if (!API.catalogLoadedFromBackend) return [];
    let items = API.mockData.showtimes;
    if (movieId) items = items.filter(s => s.movieId === movieId);
    if (chainId) items = items.filter(s => s.chainId === chainId);
    if (cinemaId) items = items.filter(s => s.cinemaId === cinemaId);
    if (date) items = items.filter(s => s.date === date);
    return items;
  },
  getAvailableDates(movieId) {
    if (!API.catalogLoadedFromBackend) return [];
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
