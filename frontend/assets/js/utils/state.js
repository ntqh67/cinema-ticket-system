/* CineTicket - Global State Management (Pub/Sub) */
const State = {
  data: {
    currentUser: null,
    cart: [],
    selectedMovie: null,
    selectedShowtime: null,
    selectedSeats: [],
    currentBooking: null,
    searchQuery: '',
    activeFilters: {}
  },

  listeners: {},

  get(key) {
    return this.data[key];
  },

  set(key, value) {
    this.data[key] = value;
    this.notify(key);
  },

  update(key, updater) {
    const currentVal = this.data[key];
    const newVal = updater(currentVal);
    this.data[key] = newVal;
    this.notify(key);
  },

  subscribe(key, callback) {
    if (!this.listeners[key]) this.listeners[key] = [];
    if (!this.listeners[key].includes(callback)) {
      this.listeners[key].push(callback);
    }
  },

  unsubscribe(key, callback) {
    if (!this.listeners[key]) return;
    this.listeners[key] = this.listeners[key].filter(cb => cb !== callback);
  },

  notify(key) {
    if (this.listeners[key]) {
      this.listeners[key].forEach(cb => {
        try { cb(this.data[key]); } catch (e) { console.error('State listener error:', e); }
      });
    }
    // Also notify wildcard listeners
    if (this.listeners['*']) {
      this.listeners['*'].forEach(cb => {
        try { cb(key, this.data[key]); } catch (e) { console.error('State wildcard listener error:', e); }
      });
    }
  },

  persist(key) {
    try {
      const val = this.data[key];
      localStorage.setItem('cineticket_state_' + key, JSON.stringify(val));
    } catch (e) {
      console.warn('State persist error:', e);
    }
  },

  hydrate() {
    const keys = ['currentUser'];
    keys.forEach(key => {
      try {
        const stored = localStorage.getItem('cineticket_state_' + key);
        if (stored !== null) {
          this.data[key] = JSON.parse(stored);
        }
      } catch (e) {
        console.warn('State hydrate error:', e);
      }
    });
  },

  clearUser() {
    this.set('currentUser', null);
    this.set('cart', []);
    this.set('selectedMovie', null);
    this.set('selectedShowtime', null);
    this.set('selectedSeats', []);
    this.set('currentBooking', null);
    localStorage.removeItem('cineticket_state_currentUser');
  }
};
