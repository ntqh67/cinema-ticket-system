/**
 * Mục đích: Lớp View dựng giao diện và cập nhật DOM cho miền phim và đánh giá phim.
 */
/* CineTicket - View phim */
// Đối tượng MovieView đóng vai trò lớp hiển thị, dựng HTML và cập nhật DOM.
const MovieView = {
  _currentStatus: 'nowShowing',
  _currentGenre: '',
  _searchQuery: '',
  _sortBy: 'rating',
  _listMode: 'customer',
  _adminMovies: [],

  // Kiểm tra điều kiện nghiệp vụ trong khối renderList trước khi tiếp tục.
  renderList(params) {
    const qs = Helpers.parseQueryString();
    const status = qs.status || 'nowShowing';
    this._listMode = 'customer';
    this._currentStatus = status;
    this._currentGenre = '';
    this._searchQuery = '';
    this._sortBy = 'rating';
    document.getElementById('footer').style.display = '';

    const main = document.getElementById('main-content');
    // Dừng hoặc đổi hướng luồng khi dữ liệu bắt buộc chưa sẵn sàng.
    if (!main) return;
    main.innerHTML = this._buildListPage();
    this._bindListEvents();
    this._renderMovieGrid();
  },

  // Kiểm tra điều kiện nghiệp vụ trong khối _buildListPage trước khi tiếp tục.
  _buildListPage() {
    return `
    <div class="movies-page">
      <div class="container">
        <div class="movies-page-header">
          <h1 class="section-title movies-page-title" style="margin-bottom:0;">Danh Sách Phim</h1>
        </div>
        ${this._buildMovieCatalog()}
      </div>
    </div>`;
  },

  // Dùng chung bộ lọc và lưới phim cho trang khách hàng và trang quản trị.
  _buildMovieCatalog() {
    const genres = this._listMode === 'admin'
      ? [...new Set(this._adminMovies.flatMap(movie => movie.genre || []))].sort()
      : MovieModel.getGenres();
    return `
      <div class="movies-status-tabs">
        ${this._listMode === 'admin' ? `
          <button class="status-tab ${this._currentStatus === 'all' ? 'active' : ''}" data-status="all">Tất Cả</button>
          <button class="status-tab ${this._currentStatus === 'nowShowing' ? 'active' : ''}" data-status="nowShowing">Đang Chiếu</button>
          <button class="status-tab ${this._currentStatus === 'comingSoon' ? 'active' : ''}" data-status="comingSoon">Sắp Chiếu</button>
          <button class="status-tab ${this._currentStatus === 'ended' ? 'active' : ''}" data-status="ended">Ngừng Chiếu</button>
        ` : `
          <button class="status-tab ${this._currentStatus === 'nowShowing' ? 'active' : ''}" data-status="nowShowing">Đang Chiếu</button>
          <button class="status-tab ${this._currentStatus === 'comingSoon' ? 'active' : ''}" data-status="comingSoon">Sắp Chiếu</button>
          <button class="status-tab ${this._currentStatus === 'all' ? 'active' : ''}" data-status="all">Tất Cả</button>
        `}
      </div>

      <div class="movies-filter-bar">
        <div class="filter-group filter-search">
          <i class="fas fa-search" style="color:var(--color-text-muted);"></i>
          <input type="text" class="form-control" id="movie-search" placeholder="Tìm kiếm phim..." value="${Helpers.escapeHtml(this._searchQuery)}" />
        </div>
        <div class="filter-group">
          <label>Thể Loại:</label>
          <select class="form-control" id="genre-filter">
            <option value="">Tất cả</option>
            ${genres.map(g => `<option value="${Helpers.escapeHtml(g)}" ${this._currentGenre === g ? 'selected' : ''}>${Helpers.escapeHtml(g)}</option>`).join('')}
          </select>
        </div>
        <div class="filter-group">
          <label>Sắp xếp:</label>
          <select class="form-control" id="sort-filter">
            <option value="rating" ${this._sortBy === 'rating' ? 'selected' : ''}>Đánh Giá</option>
            <option value="newest" ${this._sortBy === 'newest' ? 'selected' : ''}>Mới Nhất</option>
            <option value="title" ${this._sortBy === 'title' ? 'selected' : ''}>Tên A-Z</option>
            <option value="duration" ${this._sortBy === 'duration' ? 'selected' : ''}>Thời Lượng</option>
          </select>
        </div>
        <button class="filter-reset-btn" onclick="MovieView._resetFilters()">
          <i class="fas fa-undo"></i> Đặt Lại
        </button>
      </div>

      <div class="movies-result-info" id="movies-result-info"></div>
      <div class="genre-pills" id="genre-pills">
        <button class="genre-pill ${this._currentGenre === '' ? 'active' : ''}" data-genre="">Tất Cả</button>
        ${genres.map(g => `<button class="genre-pill ${this._currentGenre === g ? 'active' : ''}" data-genre="${Helpers.escapeHtml(g)}">${Helpers.escapeHtml(g)}</button>`).join('')}
      </div>
      <div class="movies-grid" id="movies-grid"></div>`;
  },

  // Kiểm tra điều kiện nghiệp vụ trong khối _bindListEvents trước khi tiếp tục.
  _bindListEvents() {
    // Gắn sự kiện đổi tab trạng thái phim.
    document.querySelectorAll('.status-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        this._currentStatus = tab.dataset.status;
        document.querySelectorAll('.status-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this._renderMovieGrid();
      });
    });
    // Gắn sự kiện tìm kiếm theo từ khóa.
    const searchEl = document.getElementById('movie-search');
    // Đánh giá điều kiện hiện tại để cập nhật giao diện và trạng thái đúng nhánh.
    if (searchEl) {
      searchEl.addEventListener('input', Helpers.debounce((e) => {
        this._searchQuery = e.target.value;
        this._renderMovieGrid();
      }, 300));
    }
    // Gắn sự kiện lọc theo thể loại.
    const genreEl = document.getElementById('genre-filter');
    // Đánh giá điều kiện hiện tại để cập nhật giao diện và trạng thái đúng nhánh.
    if (genreEl) {
      genreEl.addEventListener('change', (e) => {
        this._currentGenre = e.target.value;
        this._updateGenrePills();
        this._renderMovieGrid();
      });
    }
    // Gắn sự kiện thay đổi thứ tự sắp xếp.
    const sortEl = document.getElementById('sort-filter');
    // Đánh giá điều kiện hiện tại để cập nhật giao diện và trạng thái đúng nhánh.
    if (sortEl) {
      sortEl.addEventListener('change', (e) => {
        this._sortBy = e.target.value;
        this._renderMovieGrid();
      });
    }
    // Gắn sự kiện cho các nhãn thể loại dạng viên.
    document.getElementById('genre-pills').addEventListener('click', (e) => {
      const pill = e.target.closest('.genre-pill');
      // Dừng hoặc đổi hướng luồng khi dữ liệu bắt buộc chưa sẵn sàng.
      if (!pill) return;
      this._currentGenre = pill.dataset.genre;
      this._updateGenrePills();
      const genreEl2 = document.getElementById('genre-filter');
      // Đánh giá điều kiện hiện tại để cập nhật giao diện và trạng thái đúng nhánh.
      if (genreEl2) genreEl2.value = this._currentGenre;
      this._renderMovieGrid();
    });
  },

  // Cập nhật trạng thái hoặc dữ liệu trong khối _updateGenrePills.
  _updateGenrePills() {
    document.querySelectorAll('.genre-pill').forEach(p => {
      p.classList.toggle('active', p.dataset.genre === this._currentGenre);
    });
  },

  // Cập nhật trạng thái hoặc dữ liệu trong khối _resetFilters.
  _resetFilters() {
    this._currentStatus = this._listMode === 'admin' ? 'all' : 'nowShowing';
    this._currentGenre = '';
    this._searchQuery = '';
    this._sortBy = 'rating';
    const s = document.getElementById('movie-search'); if (s) s.value = '';
    const g = document.getElementById('genre-filter'); if (g) g.value = '';
    const so = document.getElementById('sort-filter'); if (so) so.value = 'rating';
    document.querySelectorAll('.status-tab').forEach(t => t.classList.toggle('active', t.dataset.status === this._currentStatus));
    this._updateGenrePills();
    this._renderMovieGrid();
  },

  // Dựng phần giao diện tương ứng trong khối _renderMovieGrid.
  _renderMovieGrid() {
    const filters = {};
    // Dừng hoặc đổi hướng luồng khi dữ liệu bắt buộc chưa sẵn sàng.
    if (this._currentStatus !== 'all') filters.status = this._currentStatus;
    // Đánh giá điều kiện hiện tại để cập nhật giao diện và trạng thái đúng nhánh.
    if (this._currentGenre) filters.genre = this._currentGenre;
    // Đánh giá điều kiện hiện tại để cập nhật giao diện và trạng thái đúng nhánh.
    if (this._searchQuery) filters.search = this._searchQuery;

    let movies = this._listMode === 'admin'
      ? this._adminMovies.filter(movie => {
          if (filters.status && movie.status !== filters.status) return false;
          if (filters.genre && !movie.genre.includes(filters.genre)) return false;
          if (filters.search) {
            const query = filters.search.toLowerCase();
            return movie.title.toLowerCase().includes(query) ||
              (movie.titleEn && movie.titleEn.toLowerCase().includes(query));
          }
          return true;
        })
      : MovieModel.getAll(filters);
    // Đánh giá điều kiện hiện tại để cập nhật giao diện và trạng thái đúng nhánh.
    if (this._sortBy === 'newest') movies.sort((a, b) => new Date(b.releaseDate) - new Date(a.releaseDate));
    else if (this._sortBy === 'title') movies.sort((a, b) => a.title.localeCompare(b.title));
    else if (this._sortBy === 'duration') movies.sort((a, b) => b.duration - a.duration);
    else movies.sort((a, b) => b.rating - a.rating);

    const grid = document.getElementById('movies-grid');
    const info = document.getElementById('movies-result-info');
    // Kiểm tra kết quả từ backend và chuyển sang nhánh báo lỗi khi cần.
    if (info) info.innerHTML = `<span class="movies-result-count">Hiển thị <strong>${movies.length}</strong> phim</span>`;
    // Dừng hoặc đổi hướng luồng khi dữ liệu bắt buộc chưa sẵn sàng.
    if (!grid) return;

    // Xử lý riêng trường hợp danh sách rỗng hoặc có số lượng không hợp lệ.
    if (movies.length === 0) {
      const isBackendIssue = !API.catalogLoadedFromBackend;
      grid.innerHTML = `
        <div class="empty-state" style="grid-column:1/-1;padding:60px 0;">
          <i class="fas ${isBackendIssue ? 'fa-database' : 'fa-film'}"></i>
          <h3>${isBackendIssue ? 'Khong ket noi duoc backend/database' : 'Không tìm thấy phim'}</h3>
          <p>${isBackendIssue ? 'Booking flow hien chi dung du lieu that tu PostgreSQL. Hay chay backend va refresh lai trang.' : 'Thử điều chỉnh bộ lọc để xem thêm kết quả.'}</p>
          ${isBackendIssue ? `<button class="btn btn-primary" onclick="location.reload()">Tai lai</button>` : `<button class="btn btn-outline" onclick="MovieView._resetFilters()">Xóa Bộ Lọc</button>`}
        </div>`;
      return;
    }
    grid.innerHTML = movies.map(m => this._movieCard(m, { admin: this._listMode === 'admin' })).join('');
  },

  // Dựng phần giao diện tương ứng trong khối _movieCard.
  _movieCard(movie, options = {}) {
    const isAdmin = options.admin === true;
    const isNew = new Date(movie.releaseDate) > new Date(Date.now() - 14 * 86400000);
    const ratingLabel = movie.ratingCount ? movie.rating : 'Chua co';
    const adminStatusLabels = {
      nowShowing: 'Đang chiếu',
      comingSoon: 'Sắp chiếu',
      draft: 'Bản nháp',
      ended: 'Ngừng chiếu',
    };
    const adminStatusLabel = adminStatusLabels[movie.status] || 'Chưa xác định';
    const adminStatusClass = movie.status === 'nowShowing'
      ? 'badge-success'
      : movie.status === 'ended'
        ? 'badge-danger'
        : 'badge-warning';
    const canSchedule = ['nowShowing', 'comingSoon'].includes(movie.status);
    const trailerButton = movie.trailer
      ? `<button class="overlay-btn btn-trailer" onclick="event.stopPropagation();MovieView._showTrailer('${movie.id}')" title="Xem trailer">
              <i class="fas fa-play"></i>
            </button>`
      : '';
    const primaryOverlayButton = isAdmin
      ? `<button class="overlay-btn" onclick="event.stopPropagation();MovieView.showScheduleForm('${movie.id}')" title="Xếp lịch chiếu" ${canSchedule ? '' : 'disabled'}><i class="fas fa-calendar-plus"></i></button>`
      : `<button class="overlay-btn" onclick="event.stopPropagation();Router.navigate('/movies/${movie.id}')" title="Đặt vé"><i class="fas fa-ticket-alt"></i></button>`;
    const cardActions = isAdmin
      ? `<div class="admin-movie-card-actions">
          <button class="admin-movie-card-btn admin-movie-card-btn--preview" onclick="event.stopPropagation();MovieView._showMovieSales('${movie.id}')" title="Xem doanh số"><i class="fas fa-eye"></i></button>
          <button class="admin-movie-card-btn admin-movie-card-btn--edit" onclick="event.stopPropagation();MovieView._showEditForm('${movie.id}')"><i class="fas fa-edit"></i> Chỉnh sửa</button>
          <button class="admin-movie-card-btn admin-movie-card-btn--delete" onclick="event.stopPropagation();MovieController.handleDelete('${movie.id}')" title="Xóa phim"><i class="fas fa-trash"></i></button>
        </div>`
      : movie.status === 'nowShowing'
        ? `<button class="movie-book-btn" onclick="event.stopPropagation();Router.navigate('/movies/${movie.id}')"><i class="fas fa-ticket-alt"></i> Đặt Vé</button>`
        : `<button class="movie-book-btn" style="background:var(--color-bg-elevated);color:var(--color-text-muted);cursor:default;"><i class="fas fa-bell"></i> Thông Báo</button>`;
    return `
    <div class="movie-card ${isAdmin ? 'admin-movie-card' : ''}" ${isAdmin ? `onclick="MovieView.showScheduleForm('${movie.id}')"` : `onclick="Router.navigate('/movies/${movie.id}')"`}>
      <div class="movie-poster-wrap">
        <img class="movie-poster" src="${movie.poster}" alt="${Helpers.escapeHtml(movie.title)}" loading="lazy" onerror="this.src=API.moviePosterFallback" />
        <div class="movie-poster-overlay">
          <div class="movie-overlay-btn">
            ${primaryOverlayButton}
            ${trailerButton}
          </div>
        </div>
        <span class="movie-badge-age">${movie.ageRating || 'P'}</span>
        ${isNew ? '<span class="movie-badge-new">MỚI</span>' : ''}
      </div>
      <div class="movie-info">
        <div class="movie-title" title="${Helpers.escapeHtml(movie.title)}">${Helpers.escapeHtml(movie.title)}</div>
        <div class="movie-genres">${movie.genre.slice(0, 2).join(' · ')}</div>
        <div class="movie-rating-row">
          <div class="movie-rating"><i class="fas fa-star"></i> ${ratingLabel}</div>
          <div class="movie-duration"><i class="fas fa-clock"></i> ${Helpers.formatDuration(movie.duration)}</div>
        </div>
        ${isAdmin ? `<div class="admin-movie-card-status"><span class="badge ${adminStatusClass}">${adminStatusLabel}</span><span>${Helpers.formatDate(movie.releaseDate)}${movie.endDate ? ` – ${Helpers.formatDate(movie.endDate)}` : ''}</span></div>` : ''}
      </div>
      ${cardActions}
    </div>`;
  },

  showScheduleForm(movieId) {
    const movie = this._adminMovies.find(item => item.id === movieId) || MovieModel.getById(movieId);
    if (!movie) {
      Toast.error('Không tìm thấy thông tin phim');
      return;
    }
    if (!['nowShowing', 'comingSoon'].includes(movie.status)) {
      Toast.warning('Chỉ có thể xếp lịch cho phim đang chiếu hoặc sắp chiếu');
      return;
    }
    ShowtimeView._showAddForm({
      movie,
      movieId,
      availableSlots: true,
      returnView: 'movies',
    });
  },

  // Dựng phần giao diện tương ứng trong khối _showTrailer.
  _showTrailer(movieId) {
    const movie = MovieModel.getById(movieId);
    // Dừng hoặc đổi hướng luồng khi dữ liệu bắt buộc chưa sẵn sàng.
    if (!movie) return;
    // Dừng hoặc đổi hướng luồng khi dữ liệu bắt buộc chưa sẵn sàng.
    if (!movie.trailer) {
      Toast.info('Trailer dang cap nhat');
      return;
    }
    const separator = movie.trailer.includes('?') ? '&' : '?';
    const trailerSrc = `${movie.trailer}${separator}autoplay=1`;
    const content = `
      <div class="trailer-wrapper">
        <iframe src="${trailerSrc}" allow="autoplay; encrypted-media" allowfullscreen></iframe>
      </div>`;
    Modal.show(`Trailer: ${movie.title}`, content, { size: 'lg' });
  },

  // Dựng phần giao diện tương ứng trong khối renderDetail.
  renderDetail(params) {
    const movie = MovieModel.getById(params.id);
    // Dừng hoặc đổi hướng luồng khi dữ liệu bắt buộc chưa sẵn sàng.
    if (!movie) { Router.notFound(); return; }
    document.getElementById('footer').style.display = '';
    const main = document.getElementById('main-content');
    if (!main) return;

    const genres = movie.genre.map(g => `<span class="badge badge-secondary">${Helpers.escapeHtml(g)}</span>`).join('');
    const castHtml = movie.cast.map(c => `
      <div class="cast-card">
        <div class="cast-avatar"><img src="${c.avatar}" alt="${c.name}" onerror="this.src='https://picsum.photos/80/80?grayscale'"></div>
        <div class="cast-name">${Helpers.escapeHtml(c.name)}</div>
        <div class="cast-role">${Helpers.escapeHtml(c.role)}</div>
      </div>`).join('');

    main.innerHTML = `
    <div>
      <!-- Khối nổi bật chứa poster và thông tin chính của phim -->
      <div class="movie-detail-hero">
        <div class="movie-detail-backdrop" style="background-image:url('${movie.banner}')"></div>
        <div class="movie-detail-overlay"></div>
        <div class="movie-detail-content">
          <div class="container">
            <div class="movie-detail-layout">
              <div class="movie-detail-poster">
                <img src="${movie.poster}" alt="${Helpers.escapeHtml(movie.title)}" onerror="this.src=API.moviePosterFallback" />
                <span class="poster-age-badge">${movie.ageRating || 'P'}</span>
              </div>
              <div class="movie-detail-info">
                <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;">${genres}</div>
                <h1 class="movie-detail-title">${Helpers.escapeHtml(movie.title)}</h1>
                <p class="movie-detail-title-en">${Helpers.escapeHtml(movie.titleEn || '')}</p>
                <div class="movie-detail-rating">
                  <span class="rating-score">${movie.ratingCount ? movie.rating : 'Chua co'}</span>
                  <div class="rating-stars stars">${Helpers.getStars(movie.rating / 2)}</div>
                  <span class="rating-count">${movie.ratingCount ? `/ 10 (${movie.ratingCount} danh gia)` : ''}</span>
                </div>
                <div class="movie-detail-meta">
                  <div class="meta-item"><i class="fas fa-clock"></i><span>${Helpers.formatDuration(movie.duration)}</span></div>
                  <div class="meta-item"><i class="fas fa-globe-asia"></i><span>${Helpers.escapeHtml(movie.language)}</span></div>
                  <div class="meta-item"><i class="fas fa-calendar"></i><span>${Helpers.formatDate(movie.releaseDate)}</span></div>
                  <div class="meta-item"><i class="fas fa-user-tie"></i><span><strong>ĐD:</strong> ${Helpers.escapeHtml(movie.director)}</span></div>
                </div>
                <p class="movie-detail-desc">${Helpers.escapeHtml(movie.description)}</p>
                ${this._ageWarning(movie)}
                <div class="movie-detail-actions">
                  ${movie.status === 'nowShowing'
                    ? `<button class="btn btn-primary btn-lg" onclick="MovieView.scrollToBooking('${movie.id}')"><i class="fas fa-ticket-alt"></i> Đặt Vé Ngay</button>`
                    : `<button class="btn btn-accent btn-lg" onclick="Toast.info('Tính năng nhắc nhở sẽ sớm ra mắt!')"><i class="fas fa-bell"></i> Đặt Lịch Nhắc</button>`
                  }
                  ${movie.trailer ? `<button class="btn btn-secondary" onclick="MovieView._showTrailer('${movie.id}')"><i class="fas fa-play"></i> Xem Trailer</button>` : ''}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Danh sách diễn viên của phim -->
      <div class="container" style="padding-top:40px;">
        <div style="margin-bottom:40px;">
          <h3 class="section-title">Diễn Viên</h3>
          <div class="cast-grid">${castHtml}</div>
        </div>

        <!-- Khu vực chọn rạp và suất chiếu để bắt đầu đặt vé -->
        ${movie.status === 'nowShowing' ? `
        <div id="booking-section">
          <h3 class="section-title">Chọn Suất Chiếu</h3>
          <div id="movie-booking-section"></div>
        </div>` : `
        <div style="text-align:center;padding:40px;background:var(--color-bg-card);border:1px solid var(--color-border);border-radius:var(--radius-xl);">
          <i class="fas fa-calendar-alt" style="font-size:3rem;color:var(--color-primary);opacity:0.4;margin-bottom:16px;display:block;"></i>
          <h3 style="margin-bottom:8px;">Phim Sắp Ra Mắt</h3>
          <p style="color:var(--color-text-muted);">Khởi chiếu: <strong style="color:var(--color-accent);">${Helpers.formatDate(movie.releaseDate)}</strong></p>
        </div>`}
        ${this._reviewSection(movie)}
      </div>
    </div>`;

    // Đánh giá điều kiện hiện tại để cập nhật giao diện và trạng thái đúng nhánh.
    if (movie.status === 'nowShowing') {
      ShowtimeView.renderForMovie(movie.id, 'movie-booking-section');
    }
    this._loadReviewSection(movie.id);
  },

  // Thực hiện trách nhiệm riêng của khối _ageWarning.
  _ageWarning(movie) {
    const warnings = {
      C13: 'Phim dành cho khán giả từ 13 tuổi trở lên.',
      C16: 'Phim dành cho khán giả từ 16 tuổi trở lên.',
      C18: 'Phim dành cho khán giả từ 18 tuổi trở lên.',
    };
    const message = warnings[movie.ageRating];
    // Dừng hoặc đổi hướng luồng khi dữ liệu bắt buộc chưa sẵn sàng.
    if (!message) return '';

    return `
      <div class="alert alert-warning" style="margin:16px 0;">
        <i class="fas fa-exclamation-triangle"></i>
        <strong>${Helpers.escapeHtml(movie.ageRating)}</strong> - ${message}
      </div>`;
  },

  // Thực hiện trách nhiệm riêng của khối scrollToBooking.
  scrollToBooking(movieId) {
    const bookingSection = document.getElementById('booking-section');
    // Kiểm tra trạng thái booking hoặc thanh toán để chọn bước giao diện tiếp theo.
    if (bookingSection) bookingSection.scrollIntoView({ behavior: 'smooth' });
  },

  // Dựng phần giao diện tương ứng trong khối _reviewSection.
  _reviewSection(movie) {
    return `
      <div id="movie-review-section" style="margin-top:40px;background:var(--color-bg-card);border:1px solid var(--color-border);border-radius:var(--radius-xl);padding:24px;">
        <h3 style="margin-bottom:12px;">Danh Gia Phim</h3>
        <p style="color:var(--color-text-muted);margin-bottom:16px;">
          Diem hien tai: <strong style="color:var(--color-accent);">${movie.ratingCount ? `${movie.rating}/10` : 'Chua co danh gia'}</strong>
          ${movie.ratingCount ? `(${movie.ratingCount} luot)` : ''}
        </p>
        <div style="color:var(--color-text-muted);">Dang tai quyen danh gia...</div>
      </div>`;
  },

  // Dựng phần giao diện tương ứng trong khối _loadReviewSection.
  async _loadReviewSection(movieId) {
    const section = document.getElementById('movie-review-section');
    // Dừng hoặc đổi hướng luồng khi dữ liệu bắt buộc chưa sẵn sàng.
    if (!section) return;
    const user = State.get('currentUser');
    // Bắt đầu thao tác có thể thất bại để hiển thị phản hồi phù hợp cho người dùng.
    try {
      const data = await API.getMovieReviews(movieId, user && user.backendUserId);
      const current = data.currentUserReview || {};
      const reviewList = (data.reviews || []).slice(0, 5).map(review => `
        <div style="padding:12px 0;border-top:1px solid var(--color-border);">
          <strong>${Helpers.escapeHtml(review.userName)}</strong>
          <span style="color:var(--color-accent);margin-left:8px;"><i class="fas fa-star"></i> ${review.rating}/10</span>
          ${review.comment ? `<div style="color:var(--color-text-muted);margin-top:4px;">${Helpers.escapeHtml(review.comment)}</div>` : ''}
        </div>`).join('');

      section.innerHTML = `
        <h3 style="margin-bottom:12px;">Danh Gia Phim</h3>
        <p style="color:var(--color-text-muted);margin-bottom:16px;">
          Diem hien tai: <strong style="color:var(--color-accent);">${data.ratingCount ? `${data.ratingAverage}/10` : 'Chua co danh gia'}</strong>
          ${data.ratingCount ? `(${data.ratingCount} luot)` : ''}
        </p>
        ${this._reviewAction(movieId, user, data.canReview, current)}
        <div style="margin-top:16px;">${reviewList || '<div style="color:var(--color-text-muted);">Chua co binh luan nao.</div>'}</div>
      `;
    } catch (error) {
      section.innerHTML += `<div style="color:var(--color-danger);">Khong tai duoc danh gia: ${Helpers.escapeHtml(error.message || '')}</div>`;
    }
  },

  // Thực hiện trách nhiệm riêng của khối _reviewAction.
  _reviewAction(movieId, user, canReview, current) {
    // Kiểm tra trạng thái đăng nhập hoặc vai trò trước khi cho phép thao tác.
    if (!user || !user.backendUserId) {
      return `<button class="btn btn-outline" onclick="Router.navigate('/login')">Dang nhap de danh gia</button>`;
    }
    // Dừng hoặc đổi hướng luồng khi dữ liệu bắt buộc chưa sẵn sàng.
    if (!canReview) {
      return `<div class="alert alert-info">Ban can mua ve va thanh toan thanh cong phim nay de danh gia.</div>`;
    }
    return `
      <form onsubmit="MovieView._submitReview(event, '${movieId}')">
        <div class="admin-form-grid" style="grid-template-columns:180px 1fr;">
          <div class="form-group">
            <label class="form-label">Diem (1-10)</label>
            <input class="form-control" id="movie-review-rating" type="number" min="1" max="10" value="${current.rating || 8}" required />
          </div>
          <div class="form-group">
            <label class="form-label">Nhan xet</label>
            <input class="form-control" id="movie-review-comment" type="text" value="${Helpers.escapeHtml(current.comment || '')}" placeholder="Cam nhan ngan cua ban..." />
          </div>
        </div>
        <button class="btn btn-primary" type="submit"><i class="fas fa-star"></i> ${current.id ? 'Cap Nhat Danh Gia' : 'Gui Danh Gia'}</button>
      </form>`;
  },

  // Điều phối sự kiện và phản hồi người dùng trong khối _submitReview.
  async _submitReview(event, movieId) {
    event.preventDefault();
    const user = State.get('currentUser');
    if (!user || !user.backendUserId) {
      Toast.error('Vui long dang nhap de danh gia');
      return;
    }
    const rating = parseInt(document.getElementById('movie-review-rating').value, 10);
    const comment = document.getElementById('movie-review-comment').value.trim();
    try {
      await API.createMovieReview(movieId, {
        userId: user.backendUserId,
        rating,
        comment,
      });
      await API.syncBackendCatalog();
      Toast.success('Da luu danh gia cua ban');
      Router.navigate(`/movies/${movieId}`);
    } catch (error) {
      Toast.error(error.message || 'Khong the gui danh gia');
    }
  },

  // Dựng phần giao diện tương ứng trong khối renderAdmin.
  async renderAdmin() {
    // Kiểm tra trạng thái đăng nhập hoặc vai trò trước khi cho phép thao tác.
    if (!AuthController.requireAdmin()) return;
    document.body.classList.add('admin-layout');
    this._listMode = 'admin';
    this._currentStatus = 'all';
    this._currentGenre = '';
    this._searchQuery = '';
    this._sortBy = 'newest';
    const main = document.getElementById('main-content');
    if (!main) return;
    main.innerHTML = `
      <div class="admin-layout-wrap">
        ${UserView._renderAdminSidebar('movies')}
        <div class="admin-main">
          ${UserView._renderAdminTopbar('Quản Lý Phim', 'admin/movies')}
          <div class="admin-content">
            <div class="admin-table-card"><div class="admin-table-empty">Đang tải danh sách phim từ PostgreSQL...</div></div>
          </div>
        </div>
      </div>`;

    try {
      const adminMovies = await API.getAdminMovies();
      this._adminMovies = (adminMovies || []).map(movie => this._mapAdminMovie(movie));
    } catch (error) {
      main.querySelector('.admin-content').innerHTML = `
        <div class="admin-table-card">
          <div class="admin-table-empty">Không tải được danh sách phim: ${Helpers.escapeHtml(error.message || 'Backend unavailable')}</div>
        </div>`;
      return;
    }

    const movies = this._adminMovies;
    main.innerHTML = `
    <div class="admin-layout-wrap">
      ${UserView._renderAdminSidebar('movies')}
      <div class="admin-main">
        ${UserView._renderAdminTopbar('Quản Lý Phim', 'admin/movies')}
        <div class="admin-content">
          <div class="admin-page-header">
            <div>
              <h1 class="admin-page-title">Phim</h1>
              <p class="admin-page-subtitle">${movies.length} phim trong hệ thống</p>
            </div>
            <div class="admin-page-actions">
              <button class="btn btn-secondary" onclick="MovieView._showTmdbAddForm()"><i class="fas fa-database"></i> Thêm Bằng TMDB ID</button>
              <button class="btn btn-primary" onclick="MovieView._showAddForm()"><i class="fas fa-plus"></i> Thêm Phim</button>
            </div>
          </div>
          <div class="admin-movies-catalog">
            ${this._buildMovieCatalog()}
          </div>
        </div>
      </div>
    </div>`;
    this._bindListEvents();
    this._renderMovieGrid();
  },

  // Chuẩn hóa dữ liệu Prisma của endpoint Admin về cấu trúc card phim dùng chung.
  _mapAdminMovie(movie) {
    const statusMap = {
      NOW_SHOWING: 'nowShowing',
      COMING_SOON: 'comingSoon',
      DRAFT: 'draft',
      ENDED: 'ended',
    };
    return {
      id: movie.id,
      title: movie.title,
      titleEn: movie.title,
      poster: movie.posterUrl || API.moviePosterFallback,
      banner: movie.posterUrl || API.moviePosterFallback,
      genre: (movie.genres || []).map(item => item.genre ? item.genre.name : item.name).filter(Boolean),
      duration: movie.durationMin || 0,
      language: 'Đang cập nhật',
      rating: 0,
      ratingCount: movie._count ? movie._count.reviews || 0 : 0,
      description: movie.description || '',
      director: 'Đang cập nhật',
      releaseDate: movie.releaseDate || null,
      endDate: movie.endDate || null,
      status: statusMap[movie.status] || 'draft',
      trailer: movie.trailerUrl || '',
      ageRating: movie.ageRating || 'P',
      showtimeCount: movie._count ? movie._count.showtimes || 0 : 0,
      backend: true,
    };
  },

  // Mở bảng doanh số thật của một phim mà không rời danh sách quản trị.
  async _showMovieSales(movieId) {
    const movie = this._adminMovies.find(item => item.id === movieId);
    if (!movie) return;

    Modal.show('Doanh Số Phim', `
      <div id="admin-movie-sales-content" class="admin-movie-sales-loading">
        <i class="fas fa-spinner fa-spin"></i>
        <span>Đang tải doanh số từ PostgreSQL...</span>
      </div>`, { size: 'xl', className: 'admin-movie-sales-modal' });

    let sales;
    try {
      sales = await API.getAdminMovieSales(movieId);
    } catch (error) {
      const content = document.getElementById('admin-movie-sales-content');
      if (content) {
        content.className = 'admin-movie-sales-error';
        content.innerHTML = `<i class="fas fa-triangle-exclamation"></i><span>Không tải được doanh số: ${Helpers.escapeHtml(error.message || 'Backend unavailable')}</span>`;
      }
      return;
    }

    const content = document.getElementById('admin-movie-sales-content');
    if (!content) return;
    const lastPaidAt = sales.lastPaidAt
      ? new Date(sales.lastPaidAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })
      : 'Chưa có thanh toán';
    const averageTickets = Number(sales.averageTicketsPerInvoice || 0).toLocaleString('vi-VN', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 1,
    });

    content.className = 'admin-movie-sales';
    content.innerHTML = `
      <div class="admin-movie-sales-hero">
        <img src="${Helpers.escapeHtml(movie.poster)}" alt="${Helpers.escapeHtml(movie.title)}" onerror="this.src=API.moviePosterFallback" />
        <div class="admin-movie-sales-hero-info">
          <span class="admin-dashboard-eyebrow">Báo cáo doanh số</span>
          <h2>${Helpers.escapeHtml(movie.title)}</h2>
          <div class="admin-movie-sales-meta">
            <span><i class="fas fa-calendar"></i> ${Helpers.formatDate(movie.releaseDate)}${movie.endDate ? ` – ${Helpers.formatDate(movie.endDate)}` : ''}</span>
            <span><i class="fas fa-clock"></i> ${Helpers.formatDuration(movie.duration)}</span>
          </div>
          <p>Chỉ tính hóa đơn có giao dịch thanh toán thành công.</p>
        </div>
        <div class="admin-movie-sales-total">
          <span>Tổng doanh thu</span>
          <strong>${Helpers.formatCurrency(sales.revenue)}</strong>
        </div>
      </div>

      <div class="admin-movie-sales-kpis">
        <div><span class="red"><i class="fas fa-chart-line"></i></span><small>Doanh thu</small><strong>${Helpers.formatCurrency(sales.revenue)}</strong></div>
        <div><span class="yellow"><i class="fas fa-ticket"></i></span><small>Vé đã bán</small><strong>${Number(sales.soldTickets || 0).toLocaleString('vi-VN')}</strong></div>
        <div><span class="green"><i class="fas fa-receipt"></i></span><small>Hóa đơn thành công</small><strong>${Number(sales.paidInvoices || 0).toLocaleString('vi-VN')}</strong></div>
      </div>

      <div class="admin-movie-sales-summary">
        <div>
          <span>Doanh thu trung bình mỗi hóa đơn</span>
          <strong>${Helpers.formatCurrency(sales.averageRevenuePerInvoice)}</strong>
        </div>
        <div>
          <span>Số vé trung bình mỗi hóa đơn</span>
          <strong>${averageTickets} vé</strong>
        </div>
        <div>
          <span>Thanh toán gần nhất</span>
          <strong>${lastPaidAt}</strong>
        </div>
      </div>

      ${this._renderMovieRevenueChart(sales.revenueByDate || [])}`;
  },

  // Dựng biểu đồ doanh thu theo ngày bằng CSS để không thêm thư viện frontend mới.
  _renderMovieRevenueChart(days) {
    const maxRevenue = Math.max(...days.map(day => Number(day.revenue || 0)), 0);
    const bars = days.map(day => {
      const revenue = Number(day.revenue || 0);
      const height = maxRevenue > 0
        ? Math.max(revenue > 0 ? 10 : 3, Math.round((revenue / maxRevenue) * 170))
        : 3;
      const label = new Date(`${day.date}T00:00:00`).toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
      });
      return `
        <div class="admin-movie-revenue-day" style="--bar-height:${height}px" title="${label}: ${Helpers.formatCurrency(revenue)} · ${day.invoiceCount || 0} hóa đơn">
          <span class="admin-movie-revenue-value">${revenue > 0 ? Helpers.formatCurrency(revenue) : '0 ₫'}</span>
          <div class="admin-movie-revenue-bar ${revenue === 0 ? 'is-empty' : ''}" style="height:${height}px"></div>
          <span class="admin-movie-revenue-date">${label}</span>
        </div>`;
    }).join('');

    return `
      <section class="admin-movie-revenue-chart">
        <div class="admin-movie-revenue-chart-heading">
          <div>
            <span class="admin-dashboard-eyebrow">Theo từng ngày</span>
            <h3>Doanh thu từ ngày ra mắt</h3>
          </div>
          <span>${days.length} ngày</span>
        </div>
        <div class="admin-movie-revenue-scroll">
          <div class="admin-movie-revenue-bars">
            ${bars || '<div class="admin-table-empty">Chưa có dữ liệu doanh thu</div>'}
          </div>
        </div>
      </section>`;
  },

  // Dựng phần giao diện tương ứng trong khối _adminRow.
  _adminRow(m) {
    return `<tr data-id="${m.id}">
      <td><div class="admin-movie-mini">
        <img class="admin-movie-poster" src="${m.poster}" alt="" onerror="this.src='https://picsum.photos/36/50?grayscale'" />
        <div>
          <div class="admin-movie-name">${Helpers.escapeHtml(m.title)}</div>
          <div class="admin-movie-genre">${Helpers.escapeHtml(m.language)}</div>
        </div>
      </div></td>
      <td>${m.genre.slice(0,2).join(', ')}</td>
      <td>${Helpers.formatDuration(m.duration)}</td>
      <td><span class="text-accent font-bold"><i class="fas fa-star"></i> ${m.ratingCount ? `${m.rating} (${m.ratingCount})` : 'Chua co'}</span></td>
      <td><span class="badge ${m.status === 'nowShowing' ? 'badge-success' : 'badge-warning'}">${m.status === 'nowShowing' ? 'Đang chiếu' : 'Sắp chiếu'}</span></td>
      <td>${Helpers.formatDate(m.releaseDate)}</td>
      <td><div class="table-actions">
        <button class="action-btn view" onclick="Router.navigate('/movies/${m.id}')" title="Xem"><i class="fas fa-eye"></i></button>
        <button class="action-btn edit" onclick="MovieView._showEditForm('${m.id}')" title="Sửa"><i class="fas fa-edit"></i></button>
        <button class="action-btn delete" onclick="MovieController.handleDelete('${m.id}')" title="Xóa"><i class="fas fa-trash"></i></button>
      </div></td>
    </tr>`;
  },

  // Đọc và lọc dữ liệu cần thiết trong khối _filterTable.
  _filterTable(query) {
    const tbody = document.getElementById('movies-admin-tbody');
    // Dừng hoặc đổi hướng luồng khi dữ liệu bắt buộc chưa sẵn sàng.
    if (!tbody) return;
    tbody.querySelectorAll('tr').forEach(row => {
      row.style.display = row.textContent.toLowerCase().includes(query.toLowerCase()) ? '' : 'none';
    });
  },

  // Tạo dữ liệu mới trong khối _showTmdbAddForm và trả về kết quả đã chuẩn hóa.
  _showTmdbAddForm() {
    const content = `
      <form onsubmit="MovieController.handleCreateFromTmdb(event)">
        <div class="admin-form-grid">
          <div class="form-group form-full">
            <label class="form-label">TMDB Movie ID *</label>
            <input type="text" class="form-control" id="tmdb-movie-id" placeholder="Ví dụ: 123456 hoặc link TMDB" required />
          </div>
          <div class="form-group">
            <label class="form-label">Ngày bắt đầu chiếu *</label>
            <input type="date" class="form-control" id="tmdb-movie-release" onchange="MovieView._updateTmdbDateRange()" required />
          </div>
          <div class="form-group">
            <label class="form-label">Ngày kết thúc chiếu *</label>
            <input type="date" class="form-control" id="tmdb-movie-end" required />
          </div>
          <div class="form-group form-full">
            <div class="alert alert-info" style="margin:0;">
              Backend sẽ lấy tên phim, poster, trailer, thời lượng và thể loại từ TMDB. Trạng thái phim được tự động tính theo ngày bắt đầu và ngày kết thúc.
            </div>
          </div>
        </div>
        <div style="display:flex;gap:12px;justify-content:flex-end;margin-top:16px;">
          <button type="button" class="btn btn-secondary" onclick="Modal.close()">Hủy</button>
          <button type="submit" class="btn btn-primary"><i class="fas fa-database"></i> Lấy từ TMDB</button>
        </div>
      </form>`;
    Modal.show('Thêm phim bằng TMDB ID', content, { size: 'md' });
  },

  _updateTmdbDateRange() {
    const releaseInput = document.getElementById('tmdb-movie-release');
    const endInput = document.getElementById('tmdb-movie-end');
    if (!releaseInput || !endInput) return;
    endInput.min = releaseInput.value;
    if (endInput.value && endInput.value < releaseInput.value) {
      endInput.value = releaseInput.value;
    }
  },

  // Tạo dữ liệu mới trong khối _showAddForm và trả về kết quả đã chuẩn hóa.
  _showAddForm() {
    const content = `
      <form onsubmit="MovieController.handleCreate(event)">
        <div class="admin-form-grid">
          <div class="form-group"><label class="form-label">Tên Phim *</label><input type="text" class="form-control" id="movie-title" required /></div>
          <div class="form-group"><label class="form-label">Tên Tiếng Anh</label><input type="text" class="form-control" id="movie-title-en" /></div>
          <div class="form-group"><label class="form-label">Thể Loại (phân cách bởi dấu phẩy)</label><input type="text" class="form-control" id="movie-genre" placeholder="Hành Động, Phiêu Lưu" /></div>
          <div class="form-group"><label class="form-label">Thời Lượng (phút)</label><input type="number" class="form-control" id="movie-duration" value="120" min="30" max="300" /></div>
          <div class="form-group"><label class="form-label">Ngôn Ngữ</label>
            <select class="form-control" id="movie-language">
              <option>Tiếng Việt</option><option>Tiếng Anh (Phụ đề)</option><option>Tiếng Anh (Lồng tiếng)</option>
            </select>
          </div>
          <div class="form-group"><label class="form-label">Đạo Diễn</label><input type="text" class="form-control" id="movie-director" /></div>
          <div class="form-group"><label class="form-label">Ngày Khởi Chiếu</label><input type="date" class="form-control" id="movie-release" /></div>
          <div class="form-group"><label class="form-label">Trạng Thái</label>
            <select class="form-control" id="movie-status">
              <option value="nowShowing">Đang Chiếu</option><option value="comingSoon">Sắp Chiếu</option>
            </select>
          </div>
          <div class="form-group"><label class="form-label">Link Poster</label><input type="text" class="form-control" id="movie-poster" placeholder="https://..." /></div>
          <div class="form-group form-full"><label class="form-label">Link Banner</label><input type="text" class="form-control" id="movie-banner" placeholder="https://..." /></div>
          <div class="form-group form-full"><label class="form-label">Link Trailer</label><input type="text" class="form-control" id="movie-trailer" placeholder="https://www.youtube.com/embed/..." /></div>
          <div class="form-group form-full"><label class="form-label">Mô Tả</label><textarea class="form-control" id="movie-desc" rows="3"></textarea></div>
        </div>
        <div style="display:flex;gap:12px;justify-content:flex-end;margin-top:16px;">
          <button type="button" class="btn btn-secondary" onclick="Modal.close()">Hủy</button>
          <button type="submit" class="btn btn-primary"><i class="fas fa-plus"></i> Thêm Phim</button>
        </div>
      </form>`;
    Modal.show('Thêm Phim Mới', content, { size: 'lg' });
  },

  // Dựng phần giao diện tương ứng trong khối _showEditForm.
  _showEditForm(id) {
    const m = this._listMode === 'admin'
      ? this._adminMovies.find(movie => movie.id === id)
      : MovieModel.getById(id);
    // Dừng hoặc đổi hướng luồng khi dữ liệu bắt buộc chưa sẵn sàng.
    if (!m) return;
    const releaseDate = m.releaseDate ? String(m.releaseDate).slice(0, 10) : '';
    const endDate = m.endDate ? String(m.endDate).slice(0, 10) : '';
    const content = `
      <form onsubmit="MovieView.saveEdit(event, '${m.id}')">
        <div class="admin-form-grid">
          <div class="form-group form-full">
            <label class="form-label">Tên phim *</label>
            <input type="text" class="form-control" id="edit-movie-title" value="${Helpers.escapeHtml(m.title)}" required />
          </div>
          <div class="form-group">
            <label class="form-label">Thời lượng (phút) *</label>
            <input type="number" class="form-control" id="edit-movie-duration" min="1" value="${Number(m.duration || 0)}" required />
          </div>
          <div class="form-group">
            <label class="form-label">Ngày bắt đầu *</label>
            <input type="date" class="form-control" id="edit-movie-release" value="${releaseDate}" onchange="MovieView._updateMovieStatusPreview()" required />
          </div>
          <div class="form-group">
            <label class="form-label">Ngày kết thúc *</label>
            <input type="date" class="form-control" id="edit-movie-end" value="${endDate}" min="${releaseDate}" onchange="MovieView._updateMovieStatusPreview()" required />
          </div>
          <div class="form-group">
            <label class="form-label">Phân loại tuổi</label>
            <select class="form-control" id="edit-movie-age">
              ${['P', 'C13', 'C16', 'C18'].map((rating) => `<option value="${rating}" ${m.ageRating === rating ? 'selected' : ''}>${rating}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Trạng thái tự động</label>
            <input type="text" class="form-control" id="edit-movie-status-preview" readonly />
            <span class="form-help">Tính theo ngày hiện tại tại Đà Nẵng</span>
          </div>
          <div class="form-group form-full">
            <label class="form-label">Poster URL</label>
            <input type="url" class="form-control" id="edit-movie-poster" value="${Helpers.escapeHtml(m.poster || '')}" placeholder="https://..." />
          </div>
          <div class="form-group form-full">
            <label class="form-label">Trailer URL</label>
            <input type="url" class="form-control" id="edit-movie-trailer" value="${Helpers.escapeHtml(m.trailer || '')}" placeholder="https://www.youtube.com/embed/..." />
          </div>
          <div class="form-group form-full">
            <label class="form-label">Mô tả</label>
            <textarea class="form-control" id="edit-movie-description" rows="4">${Helpers.escapeHtml(m.description || '')}</textarea>
          </div>
        </div>
        <div style="display:flex;gap:12px;justify-content:flex-end;margin-top:16px;">
          <button type="button" class="btn btn-secondary" onclick="Modal.close()">Hủy</button>
          <button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> Lưu thay đổi</button>
        </div>
      </form>`;
    Modal.show('Chỉnh Sửa Phim', content, { size: 'lg' });
    this._updateMovieStatusPreview();
  },

  // Hiển thị trước trạng thái, backend vẫn là nơi quyết định trạng thái cuối cùng.
  _updateMovieStatusPreview() {
    const releaseInput = document.getElementById('edit-movie-release');
    const endInput = document.getElementById('edit-movie-end');
    const preview = document.getElementById('edit-movie-status-preview');
    if (!releaseInput || !endInput || !preview) return;

    if (releaseInput.value) endInput.min = releaseInput.value;
    if (!releaseInput.value || !endInput.value) {
      preview.value = 'Chưa đủ ngày bắt đầu và kết thúc';
      return;
    }
    if (endInput.value < releaseInput.value) {
      preview.value = 'Ngày kết thúc không hợp lệ';
      return;
    }

    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date());
    const part = type => parts.find(item => item.type === type)?.value || '';
    const today = `${part('year')}-${part('month')}-${part('day')}`;
    preview.value = today < releaseInput.value
      ? 'Sắp chiếu'
      : today > endInput.value
        ? 'Ngừng chiếu'
        : 'Đang chiếu';
  },

  // Cập nhật trạng thái hoặc dữ liệu trong khối saveEdit.
  async saveEdit(event, id) {
    event.preventDefault();
    const releaseDate = document.getElementById('edit-movie-release').value;
    const endDate = document.getElementById('edit-movie-end').value;
    const payload = {
      title: document.getElementById('edit-movie-title').value.trim(),
      durationMin: Number(document.getElementById('edit-movie-duration').value),
      description: document.getElementById('edit-movie-description').value.trim(),
      posterUrl: document.getElementById('edit-movie-poster').value.trim() || null,
      trailerUrl: document.getElementById('edit-movie-trailer').value.trim() || null,
      releaseDate: releaseDate || undefined,
      endDate: endDate || undefined,
      ageRating: document.getElementById('edit-movie-age').value,
    };
    // Dừng hoặc đổi hướng luồng khi dữ liệu bắt buộc chưa sẵn sàng.
    if (!payload.title || !payload.durationMin) {
      Toast.error('Vui lòng nhập tên phim và thời lượng hợp lệ');
      return;
    }
    if (!releaseDate || !endDate) {
      Toast.error('Vui lòng nhập đầy đủ ngày bắt đầu và ngày kết thúc');
      return;
    }
    if (endDate < releaseDate) {
      Toast.error('Ngày kết thúc phải bằng hoặc sau ngày bắt đầu');
      return;
    }
    try {
      await API.updateAdminMovie(id, payload);
      await API.syncBackendCatalog();
      Modal.close();
      Toast.success('Đã cập nhật phim');
      this.renderAdmin();
    } catch (error) {
      Toast.error(error.message || 'Không thể cập nhật phim');
    }
  }
};
