/**
 * Mục đích: Mã nguồn phục vụ khởi tạo và tiện ích dùng chung; các khối bên dưới được giữ tách biệt theo trách nhiệm.
 */
/* CineTicket - Thành phần thanh điều hướng */
// Đối tượng Navbar gom các hành vi có cùng trách nhiệm để các phần khác tái sử dụng.
const Navbar = {
  _searchDebounced: null,

  // Dựng phần giao diện tương ứng trong khối render.
  render() {
    const user = State.get('currentUser');
    const userHtml = user
      ? `<div class="navbar-user" id="navbar-user-dropdown">
          <div class="navbar-user-toggle" onclick="Navbar.toggleUserDropdown()">
            <div class="user-avatar">${user.avatar ? `<img src="${user.avatar}" alt="">` : user.name.charAt(0).toUpperCase()}</div>
            <span class="user-name">${Helpers.escapeHtml(user.name.split(' ').pop())}</span>
            <i class="fas fa-chevron-down user-dropdown-caret"></i>
          </div>
          <div class="user-dropdown">
            <div class="user-dropdown-header">
              <div class="user-dropdown-name">${Helpers.escapeHtml(user.name)}</div>
              <div class="user-dropdown-email">${Helpers.escapeHtml(user.email)}</div>
            </div>
            <div class="user-dropdown-item" onclick="Router.navigate('/profile');Navbar.closeDropdowns()">
              <i class="fas fa-user"></i> Tài Khoản
            </div>
            <div class="user-dropdown-item" onclick="Router.navigate('/history');Navbar.closeDropdowns()">
              <i class="fas fa-ticket-alt"></i> Lịch Sử Đặt Vé
            </div>
            ${user.role === 'admin' ? `
            <div class="user-dropdown-divider"></div>
            <div class="user-dropdown-item" onclick="Router.navigate('/admin');Navbar.closeDropdowns()">
              <i class="fas fa-shield-alt"></i> Quản Trị
            </div>` : ''}
            <div class="user-dropdown-divider"></div>
            <div class="user-dropdown-item danger" onclick="AuthController.handleLogout()">
              <i class="fas fa-sign-out-alt"></i> Đăng Xuất
            </div>
          </div>
        </div>`
      : `<button class="navbar-auth-btn" onclick="Router.navigate('/login')">
          <i class="fas fa-user"></i> Đăng Nhập
        </button>`;

    return `
      <div class="navbar-inner">
        <div class="navbar-logo" onclick="Router.navigate('/')">
          <div class="navbar-logo-icon"><i class="fas fa-film"></i></div>
          <span class="navbar-logo-text">CR<span>Ticket</span></span>
        </div>
        <nav class="navbar-nav">
          <a class="nav-link" data-route="/" onclick="Router.navigate('/')">Trang Chủ</a>
          <a class="nav-link" data-route="/movies" onclick="Router.navigate('/movies')">Phim Đang Chiếu</a>
          <a class="nav-link" data-route="/cinemas" onclick="Router.navigate('/cinemas')">Rạp Chiếu</a>
        </nav>
        <div class="navbar-actions">
          <div class="navbar-search">
            <button class="navbar-search-toggle" onclick="Navbar.toggleSearch()" title="Tìm kiếm">
              <i class="fas fa-search"></i>
            </button>
            <div class="navbar-search-box" id="navbar-search-box">
              <input type="text" class="navbar-search-input" placeholder="Tìm kiếm phim..." id="navbar-search-input" oninput="Navbar.handleSearch(this.value)" />
              <div class="search-results" id="navbar-search-results"></div>
            </div>
          </div>
          ${userHtml}
        </div>
        <button class="navbar-hamburger" id="navbar-hamburger" onclick="Navbar.toggleMobileMenu()">
          <span class="hamburger-line"></span>
          <span class="hamburger-line"></span>
          <span class="hamburger-line"></span>
        </button>
      </div>
      <div class="navbar-mobile-menu" id="navbar-mobile-menu">
        <nav>
          <div class="mobile-nav-link" onclick="Router.navigate('/');Navbar.closeMobileMenu()"><i class="fas fa-home"></i> Trang Chủ</div>
          <div class="mobile-nav-link" onclick="Router.navigate('/movies');Navbar.closeMobileMenu()"><i class="fas fa-film"></i> Phim Đang Chiếu</div>
          <div class="mobile-nav-link" onclick="Router.navigate('/cinemas');Navbar.closeMobileMenu()"><i class="fas fa-map-marker-alt"></i> Rạp Chiếu</div>
          ${user ? `
          <div style="height:1px;background:var(--color-border);margin:8px 0;"></div>
          <div class="mobile-nav-link" onclick="Router.navigate('/profile');Navbar.closeMobileMenu()"><i class="fas fa-user"></i> Tài Khoản</div>
          <div class="mobile-nav-link" onclick="Router.navigate('/history');Navbar.closeMobileMenu()"><i class="fas fa-ticket-alt"></i> Lịch Sử Đặt Vé</div>
          ${user.role === 'admin' ? `<div class="mobile-nav-link" onclick="Router.navigate('/admin');Navbar.closeMobileMenu()"><i class="fas fa-shield-alt"></i> Quản Trị</div>` : ''}
          <div class="mobile-nav-link" style="color:var(--color-danger);" onclick="AuthController.handleLogout()"><i class="fas fa-sign-out-alt"></i> Đăng Xuất</div>
          ` : `
          <div style="height:1px;background:var(--color-border);margin:8px 0;"></div>
          <div class="mobile-nav-link" onclick="Router.navigate('/login');Navbar.closeMobileMenu()"><i class="fas fa-sign-in-alt"></i> Đăng Nhập / Đăng Ký</div>
          `}
        </nav>
      </div>`;
  },

  // Thực hiện trách nhiệm riêng của khối mount.
  mount() {
    const navbar = document.getElementById('navbar');
    // Dừng hoặc đổi hướng luồng khi dữ liệu bắt buộc chưa sẵn sàng.
    if (!navbar) return;
    navbar.innerHTML = this.render();
    this._bindScroll();
    this._highlightActive();
    window.addEventListener('hashchange', () => {
      this.updateAuthState(State.get('currentUser'));
      this._highlightActive();
    });
    State.subscribe('currentUser', (user) => this.updateAuthState(user));
  },

  // Cập nhật trạng thái hoặc dữ liệu trong khối updateAuthState.
  updateAuthState(user) {
    const navbar = document.getElementById('navbar');
    if (!navbar) return;
    navbar.innerHTML = this.render();
    this._bindScroll();
    this._highlightActive();
  },

  // Thực hiện trách nhiệm riêng của khối _highlightActive.
  _highlightActive() {
    const hash = window.location.hash.replace('#', '') || '/';
    document.querySelectorAll('.nav-link[data-route]').forEach(link => {
      const route = link.getAttribute('data-route');
      link.classList.toggle('active', hash === route || (route !== '/' && hash.startsWith(route)));
    });
  },

  // Điều phối sự kiện và phản hồi người dùng trong khối _bindScroll.
  _bindScroll() {
    const navbar = document.getElementById('navbar');
    const onScroll = Helpers.throttle(() => {
      // Đánh giá điều kiện hiện tại để cập nhật giao diện và trạng thái đúng nhánh.
      if (navbar) navbar.classList.toggle('scrolled', window.scrollY > 50);
    }, 100);
    window.removeEventListener('scroll', this._scrollHandler);
    this._scrollHandler = onScroll;
    window.addEventListener('scroll', onScroll);
    onScroll();
  },

  // Cập nhật trạng thái hoặc dữ liệu trong khối toggleSearch.
  toggleSearch() {
    const box = document.getElementById('navbar-search-box');
    // Dừng hoặc đổi hướng luồng khi dữ liệu bắt buộc chưa sẵn sàng.
    if (!box) return;
    box.classList.toggle('open');
    // Đánh giá điều kiện hiện tại để cập nhật giao diện và trạng thái đúng nhánh.
    if (box.classList.contains('open')) {
      const input = document.getElementById('navbar-search-input');
      // Đánh giá điều kiện hiện tại để cập nhật giao diện và trạng thái đúng nhánh.
      if (input) setTimeout(() => input.focus(), 100);
    }
  },

  handleSearch: Helpers.debounce(function(query) {
    const resultsEl = document.getElementById('navbar-search-results');
    // Kiểm tra kết quả từ backend và chuyển sang nhánh báo lỗi khi cần.
    if (!resultsEl) return;
    // Kiểm tra kết quả từ backend và chuyển sang nhánh báo lỗi khi cần.
    if (!query || query.length < 2) { resultsEl.innerHTML = ''; return; }
    const movies = MovieModel.search(query).slice(0, 5);
    // Xử lý riêng trường hợp danh sách rỗng hoặc có số lượng không hợp lệ.
    if (movies.length === 0) {
      resultsEl.innerHTML = '<p style="padding:12px;color:var(--color-text-muted);font-size:0.85rem;text-align:center;">Không tìm thấy phim</p>';
      return;
    }
    resultsEl.innerHTML = movies.map(m => `
      <div class="search-result-item" onclick="Router.navigate('/movies/${m.id}');Navbar.toggleSearch()">
        <img src="${m.poster}" alt="" onerror="this.src='https://picsum.photos/36/50?grayscale'">
        <div>
          <div class="search-result-title">${Helpers.escapeHtml(m.title)}</div>
          <div class="search-result-meta">${m.genre.slice(0,2).join(' · ')} · ${Helpers.formatDuration(m.duration)}</div>
        </div>
      </div>`).join('');
  }, 300),

  // Cập nhật trạng thái hoặc dữ liệu trong khối toggleMobileMenu.
  toggleMobileMenu() {
    const menu = document.getElementById('navbar-mobile-menu');
    const hamburger = document.getElementById('navbar-hamburger');
    // Đánh giá điều kiện hiện tại để cập nhật giao diện và trạng thái đúng nhánh.
    if (menu) menu.classList.toggle('open');
    // Đánh giá điều kiện hiện tại để cập nhật giao diện và trạng thái đúng nhánh.
    if (hamburger) hamburger.classList.toggle('open');
  },

  // Thực hiện trách nhiệm riêng của khối closeMobileMenu.
  closeMobileMenu() {
    const menu = document.getElementById('navbar-mobile-menu');
    const hamburger = document.getElementById('navbar-hamburger');
    // Đánh giá điều kiện hiện tại để cập nhật giao diện và trạng thái đúng nhánh.
    if (menu) menu.classList.remove('open');
    // Đánh giá điều kiện hiện tại để cập nhật giao diện và trạng thái đúng nhánh.
    if (hamburger) hamburger.classList.remove('open');
  },

  // Cập nhật trạng thái hoặc dữ liệu trong khối toggleUserDropdown.
  toggleUserDropdown() {
    const dropdown = document.getElementById('navbar-user-dropdown');
    // Đánh giá điều kiện hiện tại để cập nhật giao diện và trạng thái đúng nhánh.
    if (dropdown) dropdown.classList.toggle('open');
  },

  // Thực hiện trách nhiệm riêng của khối closeDropdowns.
  closeDropdowns() {
    document.querySelectorAll('.navbar-user.open').forEach(d => d.classList.remove('open'));
  }
};

// Đóng mọi menu thả xuống khi người dùng nhấp ra ngoài thanh điều hướng.
document.addEventListener('click', (e) => {
  // Kiểm tra trạng thái đăng nhập hoặc vai trò trước khi cho phép thao tác.
  if (!e.target.closest('#navbar-user-dropdown')) {
    document.querySelectorAll('.navbar-user.open').forEach(d => d.classList.remove('open'));
  }
  // Dừng hoặc đổi hướng luồng khi dữ liệu bắt buộc chưa sẵn sàng.
  if (!e.target.closest('.navbar-search')) {
    const box = document.getElementById('navbar-search-box');
    // Đánh giá điều kiện hiện tại để cập nhật giao diện và trạng thái đúng nhánh.
    if (box) box.classList.remove('open');
  }
});
