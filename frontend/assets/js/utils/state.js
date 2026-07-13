/**
 * Mục đích: Mã nguồn phục vụ khởi tạo và tiện ích dùng chung; các khối bên dưới được giữ tách biệt theo trách nhiệm.
 */
/* CineTicket - Quản lý trạng thái toàn cục theo cơ chế phát và nhận sự kiện */
// Đối tượng State lưu trạng thái dùng chung và thông báo cho các thành phần đang lắng nghe.
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

  // Đọc và lọc dữ liệu cần thiết trong khối get.
  get(key) {
    return this.data[key];
  },

  // Cập nhật trạng thái hoặc dữ liệu trong khối set.
  set(key, value) {
    this.data[key] = value;
    this.notify(key);
  },

  // Cập nhật trạng thái hoặc dữ liệu trong khối update.
  update(key, updater) {
    const currentVal = this.data[key];
    const newVal = updater(currentVal);
    this.data[key] = newVal;
    this.notify(key);
  },

  // Thực hiện trách nhiệm riêng của khối subscribe.
  subscribe(key, callback) {
    // Dừng hoặc đổi hướng luồng khi dữ liệu bắt buộc chưa sẵn sàng.
    if (!this.listeners[key]) this.listeners[key] = [];
    // Dừng hoặc đổi hướng luồng khi dữ liệu bắt buộc chưa sẵn sàng.
    if (!this.listeners[key].includes(callback)) {
      this.listeners[key].push(callback);
    }
  },

  // Thực hiện trách nhiệm riêng của khối unsubscribe.
  unsubscribe(key, callback) {
    // Dừng hoặc đổi hướng luồng khi dữ liệu bắt buộc chưa sẵn sàng.
    if (!this.listeners[key]) return;
    this.listeners[key] = this.listeners[key].filter(cb => cb !== callback);
  },

  // Thực hiện trách nhiệm riêng của khối notify.
  notify(key) {
    // Đánh giá điều kiện hiện tại để cập nhật giao diện và trạng thái đúng nhánh.
    if (this.listeners[key]) {
      this.listeners[key].forEach(cb => {
        // Bắt đầu thao tác có thể thất bại để hiển thị phản hồi phù hợp cho người dùng.
        try { cb(this.data[key]); } catch (e) { console.error('State listener error:', e); }
      });
    }
    // Đồng thời thông báo cho các listener theo dõi mọi khóa trạng thái.
    // Đánh giá điều kiện hiện tại để cập nhật giao diện và trạng thái đúng nhánh.
    if (this.listeners['*']) {
      this.listeners['*'].forEach(cb => {
        // Bắt đầu thao tác có thể thất bại để hiển thị phản hồi phù hợp cho người dùng.
        try { cb(key, this.data[key]); } catch (e) { console.error('State wildcard listener error:', e); }
      });
    }
  },

  // Kiểm tra điều kiện nghiệp vụ trong khối persist trước khi tiếp tục.
  persist(key) {
    // Bắt đầu thao tác có thể thất bại để hiển thị phản hồi phù hợp cho người dùng.
    try {
      const val = this.data[key];
      localStorage.setItem('cineticket_state_' + key, JSON.stringify(val));
    } catch (e) {
      console.warn('State persist error:', e);
    }
  },

  // Thực hiện trách nhiệm riêng của khối hydrate.
  hydrate() {
    const keys = ['currentUser'];
    keys.forEach(key => {
      // Bắt đầu thao tác có thể thất bại để hiển thị phản hồi phù hợp cho người dùng.
      try {
        const stored = localStorage.getItem('cineticket_state_' + key);
        // Dừng hoặc đổi hướng luồng khi dữ liệu bắt buộc chưa sẵn sàng.
        if (stored !== null) {
          this.data[key] = JSON.parse(stored);
        }
      } catch (e) {
        console.warn('State hydrate error:', e);
      }
    });
  },

  // Xử lý việc gỡ bỏ, hủy hoặc giải phóng dữ liệu trong khối clearUser.
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
