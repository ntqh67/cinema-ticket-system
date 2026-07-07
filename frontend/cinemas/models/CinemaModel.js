/* CineTicket - Cinema Model */
const CinemaModel = {
  getAll() { return [...API.mockData.cinemas]; },
  getById(id) { return API.mockData.cinemas.find(c => c.id === id) || null; },
  getChains() {
    const chains = new Map();
    API.mockData.cinemas.forEach((cinema) => {
      const chainId = cinema.chainId || (cinema.chain && cinema.chain.id) || cinema.id;
      const chainName = cinema.chain && cinema.chain.name ? cinema.chain.name : cinema.name;
      if (!chains.has(chainId)) chains.set(chainId, { id: chainId, name: chainName });
    });
    return [...chains.values()].sort((a, b) => a.name.localeCompare(b.name));
  },
  getByCity(city) { return API.mockData.cinemas.filter(c => c.city === city); },
  getCities() { return [...new Set(API.mockData.cinemas.map(c => c.city))]; },
  create(data) {
    const item = { ...data, id: 'ci' + Helpers.generateId(), createdAt: new Date().toISOString() };
    API.mockData.cinemas.push(item);
    API._save('cinemas');
    return { success: true, cinema: item };
  },
  update(id, data) {
    const idx = API.mockData.cinemas.findIndex(c => c.id === id);
    if (idx === -1) return { success: false };
    API.mockData.cinemas[idx] = { ...API.mockData.cinemas[idx], ...data };
    API._save('cinemas');
    return { success: true };
  },
  delete(id) {
    const idx = API.mockData.cinemas.findIndex(c => c.id === id);
    if (idx === -1) return { success: false };
    API.mockData.cinemas.splice(idx, 1);
    API._save('cinemas');
    return { success: true };
  }
};
