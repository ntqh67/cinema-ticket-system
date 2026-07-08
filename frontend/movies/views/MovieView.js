/* CineTicket - Movie View */
const MovieView = {
  _currentStatus: 'nowShowing',
  _currentGenre: '',
  _searchQuery: '',
  _sortBy: 'rating',

  renderList(params) {
    const qs = Helpers.parseQueryString();
    const status = qs.status || 'nowShowing';
    this._currentStatus = status;
    this._currentGenre = '';
    this._searchQuery = '';
    document.getElementById('footer').style.display = '';

    const main = document.getElementById('main-content');
    if (!main) return;
    main.innerHTML = this._buildListPage();
    this._bindListEvents();
    this._renderMovieGrid();
  },

  _buildListPage() {
    const genres = MovieModel.getGenres();
    return `
    <div class="movies-page">
      <div class="container">
        <div class="movies-page-header">
          <h1 class="section-title movies-page-title" style="margin-bottom:0;">Danh Sách Phim</h1>
        </div>

        <!-- Status Tabs -->
        <div class="movies-status-tabs">
          <button class="status-tab ${this._currentStatus === 'nowShowing' ? 'active' : ''}" data-status="nowShowing">Đang Chiếu</button>
          <button class="status-tab ${this._currentStatus === 'comingSoon' ? 'active' : ''}" data-status="comingSoon">Sắp Chiếu</button>
          <button class="status-tab ${this._currentStatus === 'all' ? 'active' : ''}" data-status="all">Tất Cả</button>
        </div>

        <!-- Filter Bar -->
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
              <option value="rating">Đánh Giá</option>
              <option value="newest">Mới Nhất</option>
              <option value="title">Tên A-Z</option>
              <option value="duration">Thời Lượng</option>
            </select>
          </div>
          <button class="filter-reset-btn" onclick="MovieView._resetFilters()">
            <i class="fas fa-undo"></i> Đặt Lại
          </button>
        </div>

        <!-- Result Info -->
        <div class="movies-result-info" id="movies-result-info"></div>

        <!-- Genre Pills -->
        <div class="genre-pills" id="genre-pills">
          <button class="genre-pill active" data-genre="">Tất Cả</button>
          ${genres.map(g => `<button class="genre-pill" data-genre="${Helpers.escapeHtml(g)}">${Helpers.escapeHtml(g)}</button>`).join('')}
        </div>

        <!-- Grid -->
        <div class="movies-grid" id="movies-grid"></div>
      </div>
    </div>`;
  },

  _bindListEvents() {
    // Status tabs
    document.querySelectorAll('.status-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        this._currentStatus = tab.dataset.status;
        document.querySelectorAll('.status-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this._renderMovieGrid();
      });
    });
    // Search
    const searchEl = document.getElementById('movie-search');
    if (searchEl) {
      searchEl.addEventListener('input', Helpers.debounce((e) => {
        this._searchQuery = e.target.value;
        this._renderMovieGrid();
      }, 300));
    }
    // Genre filter
    const genreEl = document.getElementById('genre-filter');
    if (genreEl) {
      genreEl.addEventListener('change', (e) => {
        this._currentGenre = e.target.value;
        this._updateGenrePills();
        this._renderMovieGrid();
      });
    }
    // Sort
    const sortEl = document.getElementById('sort-filter');
    if (sortEl) {
      sortEl.addEventListener('change', (e) => {
        this._sortBy = e.target.value;
        this._renderMovieGrid();
      });
    }
    // Genre pills
    document.getElementById('genre-pills').addEventListener('click', (e) => {
      const pill = e.target.closest('.genre-pill');
      if (!pill) return;
      this._currentGenre = pill.dataset.genre;
      this._updateGenrePills();
      const genreEl2 = document.getElementById('genre-filter');
      if (genreEl2) genreEl2.value = this._currentGenre;
      this._renderMovieGrid();
    });
  },

  _updateGenrePills() {
    document.querySelectorAll('.genre-pill').forEach(p => {
      p.classList.toggle('active', p.dataset.genre === this._currentGenre);
    });
  },

  _resetFilters() {
    this._currentStatus = 'nowShowing';
    this._currentGenre = '';
    this._searchQuery = '';
    this._sortBy = 'rating';
    const s = document.getElementById('movie-search'); if (s) s.value = '';
    const g = document.getElementById('genre-filter'); if (g) g.value = '';
    const so = document.getElementById('sort-filter'); if (so) so.value = 'rating';
    document.querySelectorAll('.status-tab').forEach(t => t.classList.toggle('active', t.dataset.status === 'nowShowing'));
    this._updateGenrePills();
    this._renderMovieGrid();
  },

  _renderMovieGrid() {
    const filters = {};
    if (this._currentStatus !== 'all') filters.status = this._currentStatus;
    if (this._currentGenre) filters.genre = this._currentGenre;
    if (this._searchQuery) filters.search = this._searchQuery;

    let movies = MovieModel.getAll(filters);
    if (this._sortBy === 'newest') movies.sort((a, b) => new Date(b.releaseDate) - new Date(a.releaseDate));
    else if (this._sortBy === 'title') movies.sort((a, b) => a.title.localeCompare(b.title));
    else if (this._sortBy === 'duration') movies.sort((a, b) => b.duration - a.duration);
    else movies.sort((a, b) => b.rating - a.rating);

    const grid = document.getElementById('movies-grid');
    const info = document.getElementById('movies-result-info');
    if (info) info.innerHTML = `<span class="movies-result-count">Hiển thị <strong>${movies.length}</strong> phim</span>`;
    if (!grid) return;

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
    grid.innerHTML = movies.map(m => this._movieCard(m)).join('');
  },

  _movieCard(movie) {
    const isNew = new Date(movie.releaseDate) > new Date(Date.now() - 14 * 86400000);
    const ratingLabel = movie.ratingCount ? movie.rating : 'Chua co';
    const trailerButton = movie.trailer
      ? `<button class="overlay-btn btn-trailer" onclick="event.stopPropagation();MovieView._showTrailer('${movie.id}')" title="Xem trailer">
              <i class="fas fa-play"></i>
            </button>`
      : '';
    return `
    <div class="movie-card" onclick="Router.navigate('/movies/${movie.id}')">
      <div class="movie-poster-wrap">
        <img class="movie-poster" src="${movie.poster}" alt="${Helpers.escapeHtml(movie.title)}" loading="lazy" onerror="this.src=API.moviePosterFallback" />
        <div class="movie-poster-overlay">
          <div class="movie-overlay-btn">
            <button class="overlay-btn" onclick="event.stopPropagation();Router.navigate('/movies/${movie.id}')" title="Đặt vé">
              <i class="fas fa-ticket-alt"></i>
            </button>
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
      </div>
      ${movie.status === 'nowShowing' ? `<button class="movie-book-btn" onclick="event.stopPropagation();Router.navigate('/movies/${movie.id}')"><i class="fas fa-ticket-alt"></i> Đặt Vé</button>` : `<button class="movie-book-btn" style="background:var(--color-bg-elevated);color:var(--color-text-muted);cursor:default;"><i class="fas fa-bell"></i> Thông Báo</button>`}
    </div>`;
  },

  _showTrailer(movieId) {
    const movie = MovieModel.getById(movieId);
    if (!movie) return;
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

  renderDetail(params) {
    const movie = MovieModel.getById(params.id);
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
      <!-- Hero -->
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
                <div class="movie-detail-actions">
                  ${movie.status === 'nowShowing'
                    ? `<button class="btn btn-primary btn-lg" onclick="document.getElementById('booking-section').scrollIntoView({behavior:'smooth'})"><i class="fas fa-ticket-alt"></i> Đặt Vé Ngay</button>`
                    : `<button class="btn btn-accent btn-lg" onclick="Toast.info('Tính năng nhắc nhở sẽ sớm ra mắt!')"><i class="fas fa-bell"></i> Đặt Lịch Nhắc</button>`
                  }
                  ${movie.trailer ? `<button class="btn btn-secondary" onclick="MovieView._showTrailer('${movie.id}')"><i class="fas fa-play"></i> Xem Trailer</button>` : ''}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Cast -->
      <div class="container" style="padding-top:40px;">
        <div style="margin-bottom:40px;">
          <h3 class="section-title">Diễn Viên</h3>
          <div class="cast-grid">${castHtml}</div>
        </div>

        <!-- Booking Section -->
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

    if (movie.status === 'nowShowing') {
      ShowtimeView.renderForMovie(movie.id, 'movie-booking-section');
    }
    this._loadReviewSection(movie.id);
  },

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

  async _loadReviewSection(movieId) {
    const section = document.getElementById('movie-review-section');
    if (!section) return;
    const user = State.get('currentUser');
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

  _reviewAction(movieId, user, canReview, current) {
    if (!user || !user.backendUserId) {
      return `<button class="btn btn-outline" onclick="Router.navigate('/login')">Dang nhap de danh gia</button>`;
    }
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

  renderAdmin() {
    if (!AuthController.requireAdmin()) return;
    document.body.classList.add('admin-layout');
    const movies = MovieModel.getAll();
    const main = document.getElementById('main-content');
    if (!main) return;
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
              <button class="btn btn-outline" onclick="MovieController.handleImportUpcomingFromTmdb()"><i class="fas fa-cloud-download-alt"></i> Cập Nhật Sắp Chiếu</button>
              <button class="btn btn-secondary" onclick="MovieView._showTmdbAddForm()"><i class="fas fa-database"></i> Thêm Bằng TMDB ID</button>
              <button class="btn btn-primary" onclick="MovieView._showAddForm()"><i class="fas fa-plus"></i> Thêm Phim</button>
            </div>
          </div>
          <div class="admin-table-card">
            <div class="admin-table-header">
              <span class="admin-table-title">Danh Sách Phim</span>
              <div class="admin-table-actions">
                <input type="text" class="form-control" placeholder="Tìm kiếm..." style="width:200px;" oninput="MovieView._filterTable(this.value)" />
              </div>
            </div>
            <div class="table-wrapper">
              <table class="admin-table">
                <thead><tr>
                  <th>Phim</th><th>Thể Loại</th><th>Thời Lượng</th><th>Đánh Giá</th><th>Trạng Thái</th><th>Ngày Chiếu</th><th>Hành Động</th>
                </tr></thead>
                <tbody id="movies-admin-tbody">
                  ${movies.map(m => this._adminRow(m)).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>`;
  },

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

  _filterTable(query) {
    const tbody = document.getElementById('movies-admin-tbody');
    if (!tbody) return;
    tbody.querySelectorAll('tr').forEach(row => {
      row.style.display = row.textContent.toLowerCase().includes(query.toLowerCase()) ? '' : 'none';
    });
  },

  _showTmdbAddForm() {
    const content = `
      <form onsubmit="MovieController.handleCreateFromTmdb(event)">
        <div class="admin-form-grid">
          <div class="form-group">
            <label class="form-label">TMDB Movie ID *</label>
            <input type="number" class="form-control" id="tmdb-movie-id" min="1" placeholder="Vi du: 123456" required />
          </div>
          <div class="form-group">
            <label class="form-label">Trang Thai</label>
            <select class="form-control" id="tmdb-movie-status">
              <option value="NOW_SHOWING">Dang Chieu</option>
              <option value="COMING_SOON">Sap Chieu</option>
              <option value="DRAFT">Ban Nhap</option>
            </select>
          </div>
          <div class="form-group form-full">
            <div class="alert alert-info" style="margin:0;">
              Backend se lay ten phim, poster, trailer, thoi luong, ngay phat hanh va the loai tu TMDB.
            </div>
          </div>
        </div>
        <div style="display:flex;gap:12px;justify-content:flex-end;margin-top:16px;">
          <button type="button" class="btn btn-secondary" onclick="Modal.close()">Huy</button>
          <button type="submit" class="btn btn-primary"><i class="fas fa-database"></i> Lay Tu TMDB</button>
        </div>
      </form>`;
    Modal.show('Them Phim Bang TMDB ID', content, { size: 'md' });
  },

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

  _showEditForm(id) {
    const m = MovieModel.getById(id);
    if (!m) return;
    Toast.info('Chức năng chỉnh sửa đang phát triển');
  }
};
