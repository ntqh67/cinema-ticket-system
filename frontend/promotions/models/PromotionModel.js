/* CineTicket - Promotion Model */
const PromotionModel = {
  getAll() { return [...API.mockData.promotions]; },
  getActive() { return API.mockData.promotions.filter(p => p.isActive); },
  getById(id) { return API.mockData.promotions.find(p => p.id === id) || null; },
  getByCode(code) { return API.mockData.promotions.find(p => p.code.toUpperCase() === code.toUpperCase()) || null; },
  create(data) {
    const item = { ...data, id: 'promo' + Helpers.generateId(), usedCount: 0 };
    API.mockData.promotions.push(item);
    API._save('promotions');
    return { success: true, promotion: item };
  },
  update(id, data) {
    const idx = API.mockData.promotions.findIndex(p => p.id === id);
    if (idx === -1) return { success: false };
    API.mockData.promotions[idx] = { ...API.mockData.promotions[idx], ...data };
    API._save('promotions');
    return { success: true };
  },
  delete(id) {
    const idx = API.mockData.promotions.findIndex(p => p.id === id);
    if (idx === -1) return { success: false };
    API.mockData.promotions.splice(idx, 1);
    API._save('promotions');
    return { success: true };
  }
};
