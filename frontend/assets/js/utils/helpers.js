/**
 * Mục đích: Mã nguồn phục vụ khởi tạo và tiện ích dùng chung; các khối bên dưới được giữ tách biệt theo trách nhiệm.
 */
/* CineTicket - Các hàm tiện ích dùng chung */
// Đối tượng Helpers gom các hành vi có cùng trách nhiệm để các phần khác tái sử dụng.
const Helpers = {
  // Chuẩn hóa dữ liệu đầu vào/đầu ra trong khối formatCurrency.
  formatCurrency(amount) {
    // Đánh giá điều kiện hiện tại để cập nhật giao diện và trạng thái đúng nhánh.
    if (amount === null || amount === undefined) return '0 ₫';
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(Number(amount) || 0);
  },

  // Chuẩn hóa dữ liệu đầu vào/đầu ra trong khối formatDate.
  formatDate(dateStr) {
    // Dừng hoặc đổi hướng luồng khi dữ liệu bắt buộc chưa sẵn sàng.
    if (!dateStr) return '';
    const d = new Date(dateStr);
    // Đánh giá điều kiện hiện tại để cập nhật giao diện và trạng thái đúng nhánh.
    if (isNaN(d)) return dateStr;
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  },

  // Chuẩn hóa dữ liệu đầu vào/đầu ra trong khối formatDateTime.
  formatDateTime(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d)) return dateStr;
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
  },

  // Chuẩn hóa dữ liệu đầu vào/đầu ra trong khối formatDuration.
  formatDuration(minutes) {
    // Dừng hoặc đổi hướng luồng khi dữ liệu bắt buộc chưa sẵn sàng.
    if (!minutes) return '';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    // Đánh giá điều kiện hiện tại để cập nhật giao diện và trạng thái đúng nhánh.
    if (h === 0) return `${m}p`;
    // Đánh giá điều kiện hiện tại để cập nhật giao diện và trạng thái đúng nhánh.
    if (m === 0) return `${h}h`;
    return `${h}h ${m}p`;
  },

  // Chuẩn hóa dữ liệu đầu vào/đầu ra trong khối formatTime.
  formatTime(timeStr) {
    return timeStr || '';
  },

  // Định dạng một thời điểm bất kỳ thành giờ và phút theo ngôn ngữ Việt Nam.
  formatTimeOfDay(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value).slice(0, 5);
    return date.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  },

  // Lấy poster và banner thống nhất từ catalog frontend, có ảnh dự phòng khi thiếu.
  getMovieVisual(movie) {
    const localMovie = movie ? MovieModel.getById(movie.id) : null;
    return {
      poster:
        localMovie && localMovie.poster
          ? localMovie.poster
          : API.moviePosterFallback,
      banner:
        localMovie && localMovie.banner
          ? localMovie.banner
          : API.moviePosterFallback,
    };
  },

  // Tạo dữ liệu mới trong khối generateId và trả về kết quả đã chuẩn hóa.
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  },

  // Thực hiện trách nhiệm riêng của khối debounce.
  debounce(fn, delay = 300) {
    let timer;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  },

  // Thực hiện trách nhiệm riêng của khối throttle.
  throttle(fn, limit = 100) {
    let lastCall = 0;
    return function (...args) {
      const now = Date.now();
      // Đánh giá điều kiện hiện tại để cập nhật giao diện và trạng thái đúng nhánh.
      if (now - lastCall >= limit) {
        lastCall = now;
        return fn.apply(this, args);
      }
    };
  },

  // Thực hiện trách nhiệm riêng của khối capitalize.
  capitalize(str) {
    // Dừng hoặc đổi hướng luồng khi dữ liệu bắt buộc chưa sẵn sàng.
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  },

  // Chuẩn hóa dữ liệu đầu vào/đầu ra trong khối truncate.
  truncate(str, maxLen = 100) {
    if (!str) return '';
    // Xử lý riêng trường hợp danh sách rỗng hoặc có số lượng không hợp lệ.
    if (str.length <= maxLen) return str;
    return str.substring(0, maxLen) + '...';
  },

  // Đọc và lọc dữ liệu cần thiết trong khối getStars.
  getStars(rating) {
    const full = Math.floor(rating);
    const half = rating % 1 >= 0.5 ? 1 : 0;
    const empty = 5 - full - half;
    let html = '';
    // Duyệt danh sách để dựng hoặc cập nhật từng phần tử giao diện.
    for (let i = 0; i < full; i++) html += '<i class="fas fa-star"></i>';
    // Đánh giá điều kiện hiện tại để cập nhật giao diện và trạng thái đúng nhánh.
    if (half) html += '<i class="fas fa-star-half-alt"></i>';
    // Duyệt danh sách để dựng hoặc cập nhật từng phần tử giao diện.
    for (let i = 0; i < empty; i++) html += '<i class="far fa-star star-empty"></i>';
    return html;
  },

  // Chuẩn hóa dữ liệu đầu vào/đầu ra trong khối slugify.
  slugify(text) {
    return text
      .toString()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '-')
      .replace(/[^\w\-]+/g, '')
      .replace(/\-\-+/g, '-')
      .trim();
  },

  // Chuẩn hóa dữ liệu đầu vào/đầu ra trong khối parseQueryString.
  parseQueryString() {
    const hash = window.location.hash;
    const queryIdx = hash.indexOf('?');
    // Đánh giá điều kiện hiện tại để cập nhật giao diện và trạng thái đúng nhánh.
    if (queryIdx === -1) return {};
    const qs = hash.substring(queryIdx + 1);
    return Object.fromEntries(new URLSearchParams(qs));
  },

  // Dựng phần giao diện tương ứng trong khối buildQueryString.
  buildQueryString(params) {
    const qs = new URLSearchParams(params).toString();
    return qs ? '?' + qs : '';
  },

  // Đọc và lọc dữ liệu cần thiết trong khối getCookie.
  getCookie(name) {
    const nameEQ = name + '=';
    const cookies = document.cookie.split(';');
    // Duyệt danh sách để dựng hoặc cập nhật từng phần tử giao diện.
    for (let c of cookies) {
      c = c.trim();
      // Xử lý riêng trường hợp danh sách rỗng hoặc có số lượng không hợp lệ.
      if (c.startsWith(nameEQ)) return decodeURIComponent(c.substring(nameEQ.length));
    }
    return null;
  },

  // Cập nhật trạng thái hoặc dữ liệu trong khối setCookie.
  setCookie(name, value, days = 7) {
    const expires = new Date();
    expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
    document.cookie = `${name}=${encodeURIComponent(value)};expires=${expires.toUTCString()};path=/`;
  },

  // Xử lý việc gỡ bỏ, hủy hoặc giải phóng dữ liệu trong khối removeCookie.
  removeCookie(name) {
    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/`;
  },

  // Kiểm tra điều kiện nghiệp vụ trong khối isEmail trước khi tiếp tục.
  isEmail(str) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str);
  },

  // Kiểm tra điều kiện nghiệp vụ trong khối isPhone trước khi tiếp tục.
  isPhone(str) {
    return /^(\+84|0)[3-9]\d{8}$/.test(str.replace(/\s/g, ''));
  },

  // Kiểm tra điều kiện nghiệp vụ trong khối isEmpty trước khi tiếp tục.
  isEmpty(val) {
    // Đánh giá điều kiện hiện tại để cập nhật giao diện và trạng thái đúng nhánh.
    if (val === null || val === undefined) return true;
    // Đánh giá điều kiện hiện tại để cập nhật giao diện và trạng thái đúng nhánh.
    if (typeof val === 'string') return val.trim() === '';
    // Xử lý riêng trường hợp danh sách rỗng hoặc có số lượng không hợp lệ.
    if (Array.isArray(val)) return val.length === 0;
    // Xử lý riêng trường hợp danh sách rỗng hoặc có số lượng không hợp lệ.
    if (typeof val === 'object') return Object.keys(val).length === 0;
    return false;
  },

  // Đọc và lọc dữ liệu cần thiết trong khối getDayName.
  getDayName(date) {
    const days = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    return days[new Date(date).getDay()];
  },

  // Đọc và lọc dữ liệu cần thiết trong khối getNext7Days.
  getNext7Days() {
    const days = [];
    const today = new Date();
    // Duyệt danh sách để dựng hoặc cập nhật từng phần tử giao diện.
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      days.push(d);
    }
    return days;
  },

  // Đọc và lọc dữ liệu cần thiết trong khối getDateString.
  getDateString(date) {
    const d = new Date(date);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  },

  // Dựng phần giao diện tương ứng trong khối escapeHtml.
  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  },

  // Đọc và lọc dữ liệu cần thiết trong khối getImageUrl.
  getImageUrl(path, fallback = 'https://picsum.photos/400/600?grayscale') {
    return path || fallback;
  }
};
