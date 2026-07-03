/* CineTicket - Movie Model */
const MovieModel = {
  getAll(filters = {}) {
    let movies = [...API.mockData.movies];
    if (filters.status) movies = movies.filter(m => m.status === filters.status);
    if (filters.genre) movies = movies.filter(m => m.genre.includes(filters.genre));
    if (filters.search) {
      const q = filters.search.toLowerCase();
      movies = movies.filter(m => m.title.toLowerCase().includes(q) || (m.titleEn && m.titleEn.toLowerCase().includes(q)));
    }
    if (filters.rating) movies = movies.filter(m => m.rating >= parseFloat(filters.rating));
    if (filters.language) movies = movies.filter(m => m.language === filters.language);
    return movies;
  },

  getById(id) {
    return API.mockData.movies.find(m => m.id === id) || null;
  },

  getByStatus(status) {
    return API.mockData.movies.filter(m => m.status === status);
  },

  getNowShowing() { return this.getByStatus('nowShowing'); },
  getComingSoon() { return this.getByStatus('comingSoon'); },

  search(query) {
    if (!query) return [];
    const q = query.toLowerCase();
    return API.mockData.movies.filter(m =>
      m.title.toLowerCase().includes(q) || (m.titleEn && m.titleEn.toLowerCase().includes(q))
    );
  },

  getGenres() {
    const genres = new Set();
    API.mockData.movies.forEach(m => m.genre.forEach(g => genres.add(g)));
    return [...genres].sort();
  },

  create(data) {
    const movie = { ...data, id: 'mv' + Helpers.generateId(), createdAt: new Date().toISOString() };
    API.mockData.movies.push(movie);
    API._save('movies');
    return { success: true, movie };
  },

  update(id, data) {
    const idx = API.mockData.movies.findIndex(m => m.id === id);
    if (idx === -1) return { success: false };
    API.mockData.movies[idx] = { ...API.mockData.movies[idx], ...data };
    API._save('movies');
    return { success: true, movie: API.mockData.movies[idx] };
  },

  delete(id) {
    const idx = API.mockData.movies.findIndex(m => m.id === id);
    if (idx === -1) return { success: false };
    API.mockData.movies.splice(idx, 1);
    API._save('movies');
    return { success: true };
  }
};
