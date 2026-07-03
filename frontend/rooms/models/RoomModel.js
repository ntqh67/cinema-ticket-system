/* CineTicket - Room Model */
const RoomModel = {
  getAll() { return [...API.mockData.rooms]; },
  getById(id) { return API.mockData.rooms.find(r => r.id === id) || null; },
  getByCinema(cinemaId) { return API.mockData.rooms.filter(r => r.cinemaId === cinemaId); },
  create(data) {
    const item = { ...data, id: 'rm' + Helpers.generateId() };
    API.mockData.rooms.push(item);
    API._save('rooms');
    return { success: true, room: item };
  },
  delete(id) {
    const idx = API.mockData.rooms.findIndex(r => r.id === id);
    if (idx === -1) return { success: false };
    API.mockData.rooms.splice(idx, 1);
    API._save('rooms');
    return { success: true };
  }
};
