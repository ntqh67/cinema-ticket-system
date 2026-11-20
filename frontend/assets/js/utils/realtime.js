/**
 * Mục đích: Kết nối Socket.IO tới backend để nhận sự kiện cập nhật sơ đồ ghế theo suất chiếu.
 * Thiếu thư viện socket.io hoặc mất kết nối thì trang vẫn dùng bình thường (chỉ không tự cập nhật).
 */
/* CineTicket - Realtime */
const Realtime = {
  // Hạn chế tải lại sơ đồ ghế khi nhiều sự kiện đến liên tiếp.
  DEBOUNCE_MS: 300,
  socket: null,
  showtimeId: null,
  _timer: null,

  // Lấy origin của backend từ backendBaseUrl (bỏ hậu tố /api).
  _origin() {
    return API.backendBaseUrl.replace(/\/api\/?$/, '');
  },

  // Theo dõi một suất chiếu; tự dừng khi người dùng rời trang ghế của suất đó.
  watchShowtime(showtimeId, onChange) {
    this.stop();
    if (typeof io === 'undefined') return;
    this.showtimeId = showtimeId;
    this.socket = io(`${this._origin()}/seats`, { transports: ['websocket'] });
    // Tham gia lại room sau mỗi lần kết nối (kể cả tự kết nối lại), và tải lại để bù sự kiện đã lỡ.
    this.socket.on('connect', () => {
      this.socket.emit('showtime:join', showtimeId);
    });
    this.socket.on('seats:changed', (payload) => {
      if (payload && payload.showtimeId === showtimeId) this._debounce(onChange);
    });
    this._onHashChange = () => {
      if (!window.location.hash.includes(`/seats/${showtimeId}`)) this.stop();
    };
    window.addEventListener('hashchange', this._onHashChange);
  },

  _debounce(callback) {
    clearTimeout(this._timer);
    this._timer = setTimeout(callback, this.DEBOUNCE_MS);
  },

  // Đóng kết nối và gỡ listener; gọi an toàn nhiều lần.
  stop() {
    clearTimeout(this._timer);
    if (this._onHashChange) window.removeEventListener('hashchange', this._onHashChange);
    if (this.socket) this.socket.close();
    this.socket = null;
    this.showtimeId = null;
    this._onHashChange = null;
  },
};
