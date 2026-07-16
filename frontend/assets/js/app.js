/**
 * Mục đích: Mã nguồn phục vụ khởi tạo và tiện ích dùng chung; các khối bên dưới được giữ tách biệt theo trách nhiệm.
 */
/* CineTicket - Điểm khởi chạy ứng dụng */
// Đối tượng App gom các hành vi có cùng trách nhiệm để các phần khác tái sử dụng.
const App = {
  _homeHeroTimer: null,
  _homeHeroIndex: 0,
  _homeHeroPaused: false,

  // Khởi tạo luồng init và chuẩn bị các phụ thuộc cần thiết.
  async init() {
    State.hydrate();
    await API.init();
    Navbar.mount();
    Footer.mount();
    this._registerRoutes();
    Router.init();
  },

  // Kiểm tra điều kiện nghiệp vụ trong khối _registerRoutes trước khi tiếp tục.
  _registerRoutes() {
    Router.register('/', () => this.renderHome());
    Router.register('/movies', (params) => MovieView.renderList(params));
    Router.register('/movies/:id', (params) => MovieView.renderDetail(params));
    Router.register('/cinemas', () => CinemaView.renderList());
    Router.register('/cinemas/:id', (params) => CinemaView.renderDetail(params));
    Router.register('/login', () => AuthView.render());
    Router.register('/profile', () => UserView.renderProfile());
    Router.register('/history', () => UserView.renderHistory());
    Router.register('/staff/attendance', () => UserView.renderStaffAttendance());
    Router.register('/seats/:id', (params) => SeatView.render(params));
    Router.register('/concessions', () => ConcessionView.renderCheckout());
    Router.register('/payment', () => PaymentView.render());
    Router.register('/ticket/:id', (params) => TicketView.render(params));

    Router.register('/admin', () => ReportView.renderDashboard());
    Router.register('/admin/reports', () => ReportView.renderReport());
    Router.register('/admin/movies', () => MovieView.renderAdmin());
    Router.register('/admin/cinemas', () => CinemaView.renderAdmin());
    Router.register('/admin/cinemas/:id', (params) => CinemaView.renderAdminDetail(params));
    Router.register('/admin/revenue', () => ReportView.renderRevenue());
    Router.register('/admin/rooms', () => RoomView.renderAdmin());
    Router.register('/admin/showtimes', () => ShowtimeView.renderAdmin());
    Router.register('/admin/bookings', () => BookingView.renderAdmin());
    Router.register('/admin/concessions', () => ConcessionView.renderAdmin());
    Router.register('/admin/users', () => UserView.renderAdmin());
    Router.register('/admin/staff', () => UserView.renderAdminStaff());
  },

  // Dựng phần giao diện tương ứng trong khối renderHome.
  renderHome() {
    const main = document.getElementById('main-content');
    // Dừng hoặc đổi hướng luồng khi dữ liệu bắt buộc chưa sẵn sàng.
    if (!main) return;
    document.getElementById('footer').style.display = '';

    this._stopHomeHeroCarousel();

    const featured = MovieModel.getNowShowing()
      .sort((a, b) => new Date(b.releaseDate || 0) - new Date(a.releaseDate || 0))
      .slice(0, 5);
    const firstMovie = featured[0];
    const comingSoon = MovieModel.getComingSoon().slice(0, 4);
    const cinemas = CinemaModel.getAll()
      .sort((a, b) => String(a.code || '').localeCompare(String(b.code || ''), 'vi', { numeric: true }))
      .slice(0, 3);

    // Dừng hoặc đổi hướng luồng khi dữ liệu bắt buộc chưa sẵn sàng.
    if (!firstMovie) {
      main.innerHTML = `
        <div class="page-wrapper">
          <div class="container">
            <div class="empty-state">
              <i class="fas fa-database"></i>
              <h3>Khong ket noi duoc backend/database</h3>
              <p>Booking flow hien chi dung du lieu that tu PostgreSQL. Hay chay backend va refresh lai trang.</p>
              <button class="btn btn-primary" onclick="location.reload()">Tai lai</button>
            </div>
          </div>
        </div>`;
      return;
    }

    main.innerHTML = `
      <section class="hero">
        <div class="hero-slider">
          ${featured.map((movie, index) => this._homeHeroSlide(movie, index)).join('')}
          ${featured.length > 1 ? `
            <button class="hero-arrow hero-arrow-prev" type="button" onclick="App.prevHomeHeroSlide(true)" aria-label="Phim trước"><i class="fas fa-chevron-left"></i></button>
            <button class="hero-arrow hero-arrow-next" type="button" onclick="App.nextHomeHeroSlide(true)" aria-label="Phim tiếp theo"><i class="fas fa-chevron-right"></i></button>
            <div class="hero-controls">
              ${featured.map((_, index) => `<button class="hero-dot ${index === 0 ? 'active' : ''}" type="button" onclick="App.showHomeHeroSlide(${index}, true)" aria-label="Chuyển tới phim ${index + 1}"></button>`).join('')}
            </div>
          ` : ''}
        </div>
      </section>

      <section class="home-section">
        <div class="container">
          <div class="home-section-header">
            <div>
              <h2 class="section-title">Phim Đang Chiếu</h2>
              <p class="section-subtitle">Chọn phim, suất chiếu và ghế yêu thích trong vài bước.</p>
            </div>
            <button class="btn btn-outline" onclick="Router.navigate('/movies')">Xem Tất Cả</button>
          </div>
          <div class="movies-grid">
            ${featured.map(movie => MovieView._movieCard(movie)).join('')}
          </div>
        </div>
      </section>

      <section class="home-section">
        <div class="container">
          <div class="home-section-header">
            <div>
              <h2 class="section-title">Sắp Chiếu</h2>
              <p class="section-subtitle">Các tựa phim sắp ra mắt tại CRTicket.</p>
            </div>
            <button class="btn btn-outline" onclick="Router.navigate('/movies?status=comingSoon')">Xem Lịch</button>
          </div>
          <div class="movies-grid">
            ${comingSoon.map(movie => MovieView._movieCard(movie)).join('')}
          </div>
        </div>
      </section>

      <section class="home-section">
        <div class="container">
          <div class="home-section-header">
            <div>
              <h2 class="section-title">Rạp Chiếu</h2>
              <p class="section-subtitle">Hệ thống rạp với nhiều phòng chiếu và tiện ích hiện đại.</p>
            </div>
            <button class="btn btn-outline" onclick="Router.navigate('/cinemas')">Tìm Rạp</button>
          </div>
          <div class="grid grid-3" style="gap:24px;">
            ${cinemas.map(cinema => `
              <div class="card">
                <img src="${Helpers.escapeHtml(cinema.imageUrl || cinema.image || API.cinemaImageFallback)}" alt="${Helpers.escapeHtml(cinema.name)}" style="width:100%;height:180px;object-fit:cover;" onerror="this.onerror=null;this.src=API.cinemaImageFallback">
                <div class="card-body">
                  <h3>${Helpers.escapeHtml(cinema.name)}</h3>
                  <p style="font-size:0.875rem;color:var(--color-text-muted);margin:10px 0 14px;"><i class="fas fa-map-marker-alt" style="color:var(--color-primary);"></i> ${Helpers.escapeHtml(cinema.address)}</p>
                  <div style="display:flex;gap:8px;flex-wrap:wrap;">
                    ${cinema.facilities.slice(0, 4).map(item => `<span class="badge badge-secondary">${Helpers.escapeHtml(item)}</span>`).join('')}
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </section>`;

    this._startHomeHeroCarousel(featured.length);
  },

  _homeHeroSlide(movie, index) {
    const visual = Helpers.getMovieVisual(movie);
    const background = visual.poster || movie.poster || movie.banner || API.moviePosterFallback;
    return `
      <div class="hero-slide ${index === 0 ? 'active' : ''}" data-hero-index="${index}">
        <div class="hero-slide-bg" style="background-image:url('${Helpers.escapeHtml(background)}')"></div>
        <div class="hero-slide-overlay"></div>
        <div class="container hero-content">
          <div class="hero-text">
            <div class="hero-badges">
              <span class="badge badge-danger"><i class="fas fa-fire"></i> Đang chiếu nổi bật</span>
            </div>
            <h1 class="hero-title">${Helpers.escapeHtml(movie.title)}</h1>
            <div class="hero-meta">
              <span class="hero-meta-item"><i class="fas fa-star"></i> ${movie.rating || 0}/10</span>
              <span class="hero-meta-item"><i class="fas fa-clock"></i> ${Helpers.formatDuration(movie.duration)}</span>
              <span class="hero-meta-item"><i class="fas fa-calendar"></i> ${Helpers.formatDate(movie.releaseDate)}</span>
            </div>
            <p class="hero-desc">${Helpers.escapeHtml(movie.description || 'Đang cập nhật')}</p>
            <div class="hero-actions">
              <button class="btn btn-primary btn-lg" onclick="Router.navigate('/movies/${movie.id}')"><i class="fas fa-ticket-alt"></i> Đặt Vé Ngay</button>
              <button class="btn btn-outline btn-lg" onclick="Router.navigate('/movies/${movie.id}')"><i class="fas fa-film"></i> Xem Phim</button>
            </div>
          </div>
        </div>
      </div>`;
  },

  _startHomeHeroCarousel(totalSlides) {
    this._homeHeroIndex = 0;
    this._homeHeroPaused = false;
    if (totalSlides <= 1) return;
    this._homeHeroTimer = setInterval(() => {
      if (!this._homeHeroPaused) this.nextHomeHeroSlide(false);
    }, 4000);
  },

  _stopHomeHeroCarousel() {
    if (this._homeHeroTimer) clearInterval(this._homeHeroTimer);
    this._homeHeroTimer = null;
    this._homeHeroPaused = false;
  },

  showHomeHeroSlide(index, pauseAuto = false) {
    const slides = Array.from(document.querySelectorAll('.hero-slide'));
    if (!slides.length) return;
    if (pauseAuto) this._homeHeroPaused = true;
    const nextIndex = (index + slides.length) % slides.length;
    slides.forEach((slide, slideIndex) => slide.classList.toggle('active', slideIndex === nextIndex));
    document.querySelectorAll('.hero-dot').forEach((dot, dotIndex) => dot.classList.toggle('active', dotIndex === nextIndex));
    this._homeHeroIndex = nextIndex;
  },

  nextHomeHeroSlide(pauseAuto = false) {
    const totalSlides = document.querySelectorAll('.hero-slide').length;
    if (!totalSlides) return;
    this.showHomeHeroSlide(this._homeHeroIndex + 1, pauseAuto);
  },

  prevHomeHeroSlide(pauseAuto = false) {
    const totalSlides = document.querySelectorAll('.hero-slide').length;
    if (!totalSlides) return;
    this.showHomeHeroSlide(this._homeHeroIndex - 1, pauseAuto);
  }
};

document.addEventListener('DOMContentLoaded', () => {
  App.init().catch((error) => {
    console.error('App init failed:', error);
    API.init();
    State.hydrate();
    Navbar.mount();
    Footer.mount();
    App._registerRoutes();
    Router.init();
  });
});
