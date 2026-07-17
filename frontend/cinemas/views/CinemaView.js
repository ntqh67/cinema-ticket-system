/* CineTicket - Cinema View */
const CinemaView = {
  renderList() {
    document.getElementById('footer').style.display = '';
    const cinemas = CinemaModel.getAll();
    const main = document.getElementById('main-content');
    if (!main) return;
    main.innerHTML = `
    <div class="page-wrapper">
      <div class="container">
        <h1 class="section-title">Hệ Thống Rạp Chiếu</h1>
        <div class="grid grid-3" style="gap:24px;" id="cinemas-grid">
          ${cinemas.map(c => this._cinemaCard(c)).join('')}
        </div>
      </div>
    </div>`;
  },

  _cinemaCard(c) {
    const rooms = API.mockData.rooms.filter(r => r.cinemaId === c.id);
    return `
    <div class="card" style="cursor:pointer;" onclick="Router.navigate('/cinemas/${c.id}')">
      <img src="${Helpers.escapeHtml(c.imageUrl || c.image || API.cinemaImageFallback)}" alt="${Helpers.escapeHtml(c.name)}" style="width:100%;height:180px;object-fit:cover;" onerror="this.onerror=null;this.src=API.cinemaImageFallback" />
      <div class="card-body">
        <h4 style="margin-bottom:8px;">${Helpers.escapeHtml(c.name)}</h4>
        ${c.code ? `<div class="badge badge-secondary" style="margin-bottom:8px;">${Helpers.escapeHtml(c.code)}</div>` : ''}
        <p style="font-size:0.875rem;color:var(--color-text-muted);margin-bottom:12px;">
          <i class="fas fa-map-marker-alt" style="color:var(--color-primary);"></i> ${Helpers.escapeHtml([c.address, c.ward, c.city].filter(Boolean).join(', '))}
        </p>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;">
          ${c.facilities.map(f => `<span class="badge badge-secondary">${Helpers.escapeHtml(f)}</span>`).join('')}
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between;font-size:0.875rem;color:var(--color-text-muted);">
          <span><i class="fas fa-door-open"></i> ${rooms.length} phòng chiếu</span>
          <span><i class="fas fa-phone"></i> ${c.phone}</span>
        </div>
      </div>
    </div>`;
  },

  async renderDetail(params) {
    document.getElementById('footer').style.display = '';
    const main = document.getElementById('main-content');
    if (!main) return;

    main.innerHTML = `
      <div class="page-wrapper">
        <div class="container">
          <div class="admin-table-card"><div class="admin-table-empty">Đang tải thông tin rạp từ PostgreSQL...</div></div>
        </div>
      </div>`;

    try {
      const detail = await API.getBackendCinemaDetail(params.id);
      const cinema = detail.cinema;
      if (!cinema) throw new Error('Không tìm thấy rạp');

      const rooms = detail.rooms || [];
      const seats = detail.seats || [];
      const overview = detail.overview || {};
      const address = [cinema.address, cinema.ward, cinema.city].filter(Boolean).join(', ');
      this._publicCinemaDetail = { id: cinema.id, cinema, rooms, seats };

      main.innerHTML = `
        <div class="page-wrapper">
          <div class="container admin-cinema-detail public-cinema-detail">
            <button class="btn btn-secondary admin-cinema-back" onclick="Router.navigate('/cinemas')"><i class="fas fa-arrow-left"></i> Danh sách rạp</button>

            <section class="admin-cinema-hero">
              <img src="${Helpers.escapeHtml(cinema.imageUrl || API.cinemaImageFallback)}" alt="${Helpers.escapeHtml(cinema.name)}" onerror="this.onerror=null;this.src=API.cinemaImageFallback" />
              <div class="admin-cinema-hero-info">
                <div class="admin-cinema-hero-badges">
                  ${cinema.code ? `<span class="badge badge-secondary">${Helpers.escapeHtml(cinema.code)}</span>` : ''}
                  ${cinema.chain?.name ? `<span class="badge badge-secondary">${Helpers.escapeHtml(cinema.chain.name)}</span>` : ''}
                </div>
                <h1>${Helpers.escapeHtml(cinema.name)}</h1>
                <p><i class="fas fa-location-dot"></i> ${Helpers.escapeHtml(address || 'Chưa cập nhật địa chỉ')}</p>
                <div class="admin-cinema-contact">
                  ${cinema.phone ? `<span><i class="fas fa-phone"></i> ${Helpers.escapeHtml(cinema.phone)}</span>` : ''}
                  ${cinema.email ? `<span><i class="fas fa-envelope"></i> ${Helpers.escapeHtml(cinema.email)}</span>` : ''}
                </div>
              </div>
            </section>

            <section class="admin-cinema-kpis" aria-label="Tổng quan rạp">
              <article><span class="red"><i class="fas fa-door-open"></i></span><div><small>Số phòng</small><strong>${Number(overview.rooms || rooms.length).toLocaleString('vi-VN')}</strong></div></article>
              <article><span class="yellow"><i class="fas fa-couch"></i></span><div><small>Tổng ghế</small><strong>${Number(overview.seats || seats.length).toLocaleString('vi-VN')}</strong></div></article>
              <article><span class="blue"><i class="fas fa-map-marker-alt"></i></span><div><small>Khu vực</small><strong>${Helpers.escapeHtml(cinema.ward || cinema.city || 'Đà Nẵng')}</strong></div></article>
            </section>

            <section class="admin-cinema-section">
              <div class="admin-cinema-section-heading">
                <div><span class="admin-dashboard-eyebrow">Phòng chiếu</span><h2>Sơ đồ ghế theo từng phòng</h2></div>
                <span>${rooms.length} phòng</span>
              </div>
              <div class="admin-cinema-room-grid">
                ${rooms.map((room) => this._publicRoomCard(room)).join('') || '<div class="admin-table-empty">Rạp chưa có phòng chiếu</div>'}
              </div>
            </section>
          </div>
        </div>`;
    } catch (error) {
      Toast.error(error.message || 'Không thể tải chi tiết rạp');
      main.innerHTML = `
        <div class="page-wrapper">
          <div class="container">
            <div class="empty-state">
              <i class="fas fa-exclamation-triangle"></i>
              <h3>Không tải được thông tin rạp</h3>
              <p>${Helpers.escapeHtml(error.message || 'Vui lòng kiểm tra backend/database rồi thử lại.')}</p>
              <button class="btn btn-primary" onclick="Router.navigate('/cinemas')">Về danh sách rạp</button>
            </div>
          </div>
        </div>`;
    }
  },

  _publicRoomCard(room) {
    const seatSummary = room.seatTypeSummary || {};
    return `
      <article class="admin-cinema-room-card">
        <div class="admin-cinema-room-icon"><i class="fas fa-film"></i></div>
        <div class="admin-cinema-room-info">
          <h3>${Helpers.escapeHtml(room.name)}</h3>
          <p>${Number(room.rows || 0).toLocaleString('vi-VN')} hàng × ${Number(room.cols || 0).toLocaleString('vi-VN')} cột</p>
          <div>
            <span>${Number(room.capacity || room.seatCount || 0).toLocaleString('vi-VN')} ghế</span>
            <span>Thường ${Number(seatSummary.STANDARD || 0).toLocaleString('vi-VN')}</span>
            <span>Đôi ${Number(seatSummary.COUPLE || 0).toLocaleString('vi-VN')}</span>
          </div>
        </div>
        <div class="admin-cinema-room-actions" style="grid-template-columns:1fr;">
          <button class="btn btn-outline btn-sm" onclick="CinemaView.showPublicRoomSeatMap('${room.id}')"><i class="fas fa-couch"></i> Xem sơ đồ ghế</button>
        </div>
      </article>`;
  },

  showPublicRoomSeatMap(roomId) {
    const detail = this._publicCinemaDetail;
    const room = detail?.rooms.find(item => item.id === roomId);
    if (!room) return;
    const seats = detail.seats.filter(seat => seat.roomId === roomId);
    const rows = [...new Set(seats.map(seat => seat.row))].sort((a, b) =>
      String(a).localeCompare(String(b), 'vi', { numeric: true }),
    );
    const content = `
      <div class="admin-room-seat-map">
        <div class="admin-room-seat-summary"><strong>${Helpers.escapeHtml(room.name)}</strong><span>${seats.length} ghế · ${rows.length} hàng</span></div>
        <div class="admin-room-screen"><span>Màn hình</span></div>
        <div class="admin-room-seat-map-scroll">
          ${rows.map(row => `<div class="admin-room-seat-row"><span>${Helpers.escapeHtml(row)}</span><div>${seats.filter(seat => seat.row === row).sort((a, b) => a.position - b.position).map(seat => `<span class="admin-room-seat ${seat.type === 'COUPLE' ? 'couple' : ''}" title="Ghế ${Helpers.escapeHtml(row)}${seat.number}">${seat.number}</span>`).join('')}</div><span>${Helpers.escapeHtml(row)}</span></div>`).join('') || '<div class="admin-table-empty">Phòng chưa có sơ đồ ghế</div>'}
        </div>
        <div class="admin-room-seat-legend"><span><i class="standard"></i> Ghế thường</span><span><i class="couple"></i> Ghế đôi</span></div>
      </div>`;
    Modal.show('Sơ Đồ Ghế', content, { size: 'xl', className: 'admin-room-seat-modal' });
  },

  async renderAdmin() {
    if (!AuthController.requireAdmin()) return;
    document.body.classList.add('admin-layout');
    this._adminCinemaDetail = null;
    let cinemas = [];
    try {
      cinemas = await API.getAdminCinemas();
    } catch (error) {
      Toast.error(error.message || 'Không thể tải danh sách rạp');
      cinemas = CinemaModel.getAll();
    }
    cinemas.sort((a, b) => String(a.code || '').localeCompare(String(b.code || ''), 'vi', { numeric: true }));
    this._adminCinemas = cinemas;
    const main = document.getElementById('main-content');
    if (!main) return;
    main.innerHTML = `
    <div class="admin-layout-wrap">
      ${UserView._renderAdminSidebar('cinemas')}
      <div class="admin-main">
        ${UserView._renderAdminTopbar('Quản Lý Rạp Chiếu', 'admin/cinemas')}
        <div class="admin-content">
          <div class="admin-page-header">
            <div>
              <h1 class="admin-page-title">Rạp Chiếu</h1>
              <p class="admin-page-subtitle">${cinemas.length} rạp trong hệ thống</p>
            </div>
            <div class="admin-page-actions">
              <button class="btn btn-primary" onclick="Toast.info('Tính năng thêm rạp đang phát triển')"><i class="fas fa-plus"></i> Thêm Rạp</button>
            </div>
          </div>
          <div class="grid grid-3" style="gap:20px;">
            ${cinemas.map(c => {
              const rooms = c.rooms || API.mockData.rooms.filter(r => r.cinemaId === c.id);
              const prices = this._ticketPriceText(c.ticketPrices || []);
              return `
              <div class="card" style="cursor:pointer;" onclick="Router.navigate('/admin/cinemas/${c.id}')">
                <img src="${Helpers.escapeHtml(c.imageUrl || c.image || API.cinemaImageFallback)}" alt="${Helpers.escapeHtml(c.name)}" style="width:100%;height:160px;object-fit:cover;" onerror="this.onerror=null;this.src=API.cinemaImageFallback" />
                <div class="card-body">
                  <h4 style="margin-bottom:6px;">${Helpers.escapeHtml(c.name)}</h4>
                  ${c.code ? `<div class="badge badge-secondary" style="margin-bottom:8px;">${Helpers.escapeHtml(c.code)}</div>` : ''}
                  <p style="font-size:0.8rem;color:var(--color-text-muted);margin-bottom:8px;">${Helpers.escapeHtml([c.address, c.ward, c.city].filter(Boolean).join(', '))}</p>
                  <p style="font-size:0.78rem;color:var(--color-primary);font-weight:700;margin-bottom:8px;">${prices}</p>
                  <div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap;">
                    ${(c.facilities || []).slice(0,3).map(f => `<span class="badge badge-secondary" style="font-size:0.65rem;">${Helpers.escapeHtml(f)}</span>`).join('')}
                  </div>
                  <div style="font-size:0.8rem;color:var(--color-text-muted);margin-bottom:12px;">
                    <i class="fas fa-door-open"></i> ${rooms.length} phòng &nbsp;|&nbsp; <i class="fas fa-phone"></i> ${c.phone}
                  </div>
                  <div class="table-actions">
                    <button class="action-btn edit" onclick="event.stopPropagation();CinemaView.showTicketPriceForm('${c.id}')" title="Giá Vé"><i class="fas fa-dollar-sign"></i></button>
                    <button class="action-btn edit" onclick="event.stopPropagation();CinemaView.showEditForm('${c.id}')" title="Sửa"><i class="fas fa-edit"></i></button>
                    <button class="action-btn delete" onclick="event.stopPropagation();CinemaController.handleDelete('${c.id}')" title="Xóa"><i class="fas fa-trash"></i></button>
                  </div>
                </div>
              </div>`;
            }).join('')}
          </div>
        </div>
      </div>
    </div>`;
  },

  async renderAdminDetail(params) {
    if (!AuthController.requireAdmin()) return;
    document.body.classList.add('admin-layout');
    const main = document.getElementById('main-content');
    if (!main) return;
    main.innerHTML = `
      <div class="admin-layout-wrap">
        ${UserView._renderAdminSidebar('cinemas')}
        <div class="admin-main">
          <div class="admin-content"><div class="admin-table-card"><div class="admin-table-empty">Đang tải thông tin rạp từ PostgreSQL...</div></div></div>
        </div>
    </div>`;
    try {
      const detail = await API.getAdminCinemaDetail(params.id);
      const cinema = detail.cinema;
      const cinemaRooms = detail.rooms || [];
      const cinemaShowtimes = detail.showtimes || [];
      const cinemaSeats = detail.seats || [];
      const overview = detail.overview || {};
      if (!cinema) throw new Error('Không tìm thấy rạp');
      this._adminCinemas = [cinema];
      const movies = [...new Map(cinemaShowtimes
        .filter(showtime => showtime.movie)
        .map(showtime => [showtime.movie.id, showtime.movie])).values()]
        .sort((a, b) => a.title.localeCompare(b.title, 'vi'));
      const address = [cinema.address, cinema.ward, cinema.city].filter(Boolean).join(', ');
      this._adminCinemaDetail = {
        id: cinema.id,
        cinema,
        rooms: cinemaRooms,
        seats: cinemaSeats,
        showtimes: cinemaShowtimes,
      };
      main.innerHTML = `
        <div class="admin-layout-wrap">
          ${UserView._renderAdminSidebar('cinemas')}
          <div class="admin-main">
            <div class="admin-content admin-cinema-detail">
              <button class="btn btn-secondary admin-cinema-back" onclick="Router.navigate('/admin/cinemas')"><i class="fas fa-arrow-left"></i> Danh sách rạp</button>

              <section class="admin-cinema-hero">
                <img src="${Helpers.escapeHtml(cinema.imageUrl || cinema.image || API.cinemaImageFallback)}" alt="${Helpers.escapeHtml(cinema.name)}" onerror="this.onerror=null;this.src=API.cinemaImageFallback" />
                <div class="admin-cinema-hero-info">
                  <div class="admin-cinema-hero-badges">
                    ${cinema.code ? `<span class="badge badge-secondary">${Helpers.escapeHtml(cinema.code)}</span>` : ''}
                    <span class="badge badge-success"><i class="fas fa-circle"></i> Đang hoạt động</span>
                  </div>
                  <h1>${Helpers.escapeHtml(cinema.name)}</h1>
                  <p><i class="fas fa-location-dot"></i> ${Helpers.escapeHtml(address || 'Chưa cập nhật địa chỉ')}</p>
                  <div class="admin-cinema-contact">
                    ${cinema.phone ? `<span><i class="fas fa-phone"></i> ${Helpers.escapeHtml(cinema.phone)}</span>` : ''}
                    ${cinema.email ? `<span><i class="fas fa-envelope"></i> ${Helpers.escapeHtml(cinema.email)}</span>` : ''}
                  </div>
                </div>
                <button class="btn btn-primary" onclick="CinemaView.showEditForm('${cinema.id}')"><i class="fas fa-edit"></i> Chỉnh sửa rạp</button>
              </section>

              <section class="admin-cinema-kpis" aria-label="Tổng quan rạp">
                <article><span class="red"><i class="fas fa-door-open"></i></span><div><small>Số phòng</small><strong>${overview.rooms}</strong></div></article>
                <article><span class="yellow"><i class="fas fa-couch"></i></span><div><small>Tổng ghế</small><strong>${Number(overview.seats).toLocaleString('vi-VN')}</strong></div></article>
                <article><span class="blue"><i class="fas fa-calendar-day"></i></span><div><small>Suất chiếu hôm nay</small><strong>${overview.todayShowtimes}</strong></div></article>
                <article><span class="green"><i class="fas fa-chart-line"></i></span><div><small>Doanh thu</small><strong>${Helpers.formatCurrency(overview.revenue)}</strong></div></article>
              </section>

              <section class="admin-cinema-section">
                <div class="admin-cinema-section-heading">
                  <div><span class="admin-dashboard-eyebrow">Phòng chiếu</span><h2>Danh sách phòng</h2></div>
                  <span>${cinemaRooms.length} phòng</span>
                </div>
                <div class="admin-cinema-room-grid">
                  ${cinemaRooms.map((room) => {
                    const seatSummary = room.seatTypeSummary || {};
                    return `<article class="admin-cinema-room-card" role="button" tabindex="0" onclick="CinemaView.showRoomSchedule('${room.id}')" onkeydown="if(event.target===this&&(event.key==='Enter'||event.key===' ')){event.preventDefault();CinemaView.showRoomSchedule('${room.id}');}">
                      <div class="admin-cinema-room-icon"><i class="fas fa-film"></i></div>
                      <div class="admin-cinema-room-info">
                        <h3>${Helpers.escapeHtml(room.name)}</h3>
                        <p>${room.rows || 0} hàng × ${room.cols || 0} cột</p>
                        <div><span>${room.capacity || room.seatCount || 0} ghế</span><span>Thường ${seatSummary.STANDARD || 0}</span><span>Đôi ${seatSummary.COUPLE || 0}</span></div>
                      </div>
                      <div class="admin-cinema-room-actions">
                        <button class="btn btn-outline btn-sm" onclick="event.stopPropagation();CinemaView.showRoomSeatMap('${room.id}')"><i class="fas fa-couch"></i> Sơ đồ ghế</button>
                        <button class="btn btn-secondary btn-sm" onclick="event.stopPropagation();CinemaView.showRoomStatus('${room.id}')"><i class="fas fa-signal"></i> Trạng thái</button>
                        <button class="btn btn-secondary btn-sm" onclick="event.stopPropagation();CinemaView.showRoomHistory('${room.id}')"><i class="fas fa-clock-rotate-left"></i> Lịch sử</button>
                      </div>
                    </article>`;
                  }).join('') || '<div class="admin-table-empty">Rạp chưa có phòng chiếu</div>'}
                </div>
              </section>

              <section class="admin-table-card admin-cinema-schedule">
                <div class="admin-table-header">
                  <div><span class="admin-dashboard-eyebrow">Lịch vận hành</span><span class="admin-table-title">Lịch chiếu tại rạp</span></div>
                  <div class="admin-cinema-schedule-filters">
                    <input type="date" class="form-control" id="cinema-schedule-date" value="${overview.date}" onchange="CinemaView.filterCinemaSchedule()" />
                    <select class="form-control" id="cinema-schedule-movie" onchange="CinemaView.filterCinemaSchedule()">
                      <option value="">Tất cả phim</option>
                      ${movies.map(movie => `<option value="${movie.id}">${Helpers.escapeHtml(movie.title)}</option>`).join('')}
                    </select>
                    <select class="form-control" id="cinema-schedule-room" onchange="CinemaView.filterCinemaSchedule()">
                      <option value="">Tất cả phòng</option>
                      ${cinemaRooms.map(room => `<option value="${room.id}">${Helpers.escapeHtml(room.name)}</option>`).join('')}
                    </select>
                    <button class="filter-reset-btn" onclick="CinemaView.resetCinemaScheduleFilters()"><i class="fas fa-undo"></i> Đặt lại</button>
                  </div>
                </div>
                <div class="table-wrapper"><table class="admin-table"><thead><tr><th>Phim</th><th>Phòng</th><th>Bắt đầu</th><th>Kết thúc</th><th>Ghế đã đặt</th></tr></thead><tbody id="cinema-schedule-body">
                  ${cinemaShowtimes.map((showtime) => {
                    const startAt = new Date(showtime.startAt);
                    const endAt = new Date(showtime.endAt);
                    const dateKey = this._dateKeyInDaNang(startAt);
                    return `<tr data-date="${dateKey}" data-movie-id="${showtime.movieId}" data-room-id="${showtime.roomId}"><td>${Helpers.escapeHtml(showtime.movie?.title || '')}</td><td>${Helpers.escapeHtml(showtime.room?.name || '')}</td><td>${startAt.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</td><td>${endAt.toLocaleTimeString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</td><td><strong>${showtime.bookedSeats || 0}</strong>/${showtime.totalSeats || 0}</td></tr>`;
                  }).join('')}
                  <tr id="cinema-schedule-empty" style="display:none;"><td colspan="5" class="admin-table-empty">Không có suất chiếu phù hợp</td></tr>
                </tbody></table></div>
              </section>
            </div>
          </div>
        </div>`;
      this.filterCinemaSchedule();
    } catch (error) {
      Toast.error(error.message || 'Không thể tải chi tiết rạp');
      Router.navigate('/admin/cinemas');
    }
  },

  _dateKeyInDaNang(value) {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit'
    }).formatToParts(value);
    const get = type => parts.find(part => part.type === type)?.value || '';
    return `${get('year')}-${get('month')}-${get('day')}`;
  },

  filterCinemaSchedule() {
    const body = document.getElementById('cinema-schedule-body');
    if (!body) return;
    const date = document.getElementById('cinema-schedule-date')?.value || '';
    const movieId = document.getElementById('cinema-schedule-movie')?.value || '';
    const roomId = document.getElementById('cinema-schedule-room')?.value || '';
    let visible = 0;
    body.querySelectorAll('tr[data-date]').forEach(row => {
      const matches = (!date || row.dataset.date === date) &&
        (!movieId || row.dataset.movieId === movieId) &&
        (!roomId || row.dataset.roomId === roomId);
      row.style.display = matches ? '' : 'none';
      if (matches) visible += 1;
    });
    const empty = document.getElementById('cinema-schedule-empty');
    if (empty) empty.style.display = visible === 0 ? '' : 'none';
  },

  resetCinemaScheduleFilters() {
    const date = document.getElementById('cinema-schedule-date');
    const movie = document.getElementById('cinema-schedule-movie');
    const room = document.getElementById('cinema-schedule-room');
    if (date) date.value = '';
    if (movie) movie.value = '';
    if (room) room.value = '';
    this.filterCinemaSchedule();
  },

  showRoomSchedule(roomId) {
    const detail = this._adminCinemaDetail;
    const room = detail?.rooms.find(item => item.id === roomId);
    if (!detail || !room) return;
    ShowtimeView._showAddForm({
      cinemaId: detail.id,
      roomId,
      cinema: detail.cinema,
      room,
      returnCinemaId: detail.id,
    });
  },

  async showRoomHistory(roomId) {
    const detail = this._adminCinemaDetail;
    const room = detail?.rooms.find(item => item.id === roomId);
    if (!room) return;

    let history;
    try {
      history = await API.getAdminRoomHistory(roomId);
    } catch (error) {
      Toast.error(error.message || 'Không thể tải lịch sử phòng chiếu');
      return;
    }

    const rows = history.showtimes || [];
    const content = `
      <div class="admin-room-history">
        <div class="admin-room-history-summary">
          <div><small>Phòng chiếu</small><strong>${Helpers.escapeHtml(history.room?.name || room.name)}</strong></div>
          <div><small>Suất đã kết thúc</small><strong>${Number(history.totalShowtimes || 0).toLocaleString('vi-VN')}</strong></div>
          <div><small>Tổng vé đã bán</small><strong>${Number(history.soldTickets || 0).toLocaleString('vi-VN')}</strong></div>
          <div class="revenue"><small>Tổng tiền đã nhận</small><strong>${Helpers.formatCurrency(history.revenue || 0)}</strong></div>
        </div>
        <div class="table-wrapper">
          <table class="admin-table">
            <thead><tr><th>Phim</th><th>Ngày chiếu</th><th>Khung giờ</th><th>Hóa đơn</th><th>Vé bán</th><th>Đã nhận</th></tr></thead>
            <tbody>
              ${rows.map(item => {
                const startAt = new Date(item.startAt);
                const endAt = new Date(item.endAt);
                return `<tr>
                  <td><strong>${Helpers.escapeHtml(item.movie?.title || '')}</strong></td>
                  <td>${startAt.toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</td>
                  <td>${startAt.toLocaleTimeString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit' })} – ${endAt.toLocaleTimeString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit' })}</td>
                  <td>${Number(item.paidInvoices || 0).toLocaleString('vi-VN')}</td>
                  <td>${Number(item.soldTickets || 0).toLocaleString('vi-VN')}</td>
                  <td><strong class="admin-room-history-money">${Helpers.formatCurrency(item.revenue || 0)}</strong></td>
                </tr>`;
              }).join('') || '<tr><td colspan="6" class="admin-table-empty">Phòng chưa có suất chiếu đã kết thúc</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>`;
    Modal.show(`Lịch Sử · ${room.name}`, content, { size: 'xl', className: 'admin-room-history-modal' });
  },

  showRoomSeatMap(roomId) {
    const detail = this._adminCinemaDetail;
    const room = detail?.rooms.find(item => item.id === roomId);
    if (!room) return;
    const seats = detail.seats.filter(seat => seat.roomId === roomId);
    const rows = [...new Set(seats.map(seat => seat.row))].sort();
    const content = `
      <div class="admin-room-seat-map">
        <div class="admin-room-seat-summary"><strong>${Helpers.escapeHtml(room.name)}</strong><span>${seats.length} ghế · ${rows.length} hàng</span></div>
        <div class="admin-room-screen"><span>Màn hình</span></div>
        <div class="admin-room-seat-map-scroll">
          ${rows.map(row => `<div class="admin-room-seat-row"><span>${Helpers.escapeHtml(row)}</span><div>${seats.filter(seat => seat.row === row).sort((a, b) => a.position - b.position).map(seat => `<span class="admin-room-seat ${seat.type === 'COUPLE' ? 'couple' : ''}" title="Ghế ${Helpers.escapeHtml(row)}${seat.number}">${seat.number}</span>`).join('')}</div><span>${Helpers.escapeHtml(row)}</span></div>`).join('') || '<div class="admin-table-empty">Phòng chưa có sơ đồ ghế</div>'}
        </div>
        <div class="admin-room-seat-legend"><span><i class="standard"></i> Ghế thường</span><span><i class="couple"></i> Ghế đôi</span></div>
      </div>`;
    Modal.show('Sơ Đồ Ghế', content, { size: 'xl', className: 'admin-room-seat-modal' });
  },

  async showRoomStatus(roomId) {
    const detail = this._adminCinemaDetail;
    const room = detail?.rooms.find(item => item.id === roomId);
    if (!room) return;

    const now = new Date();
    const activeShowtime = detail.showtimes.find(showtime => {
      if (showtime.roomId !== roomId) return false;
      const startAt = new Date(showtime.startAt);
      const endAt = new Date(showtime.endAt);
      return startAt <= now && now < endAt;
    });

    let liveSeats = [];
    if (activeShowtime) {
      try {
        const payload = await API.getShowtimeSeats(activeShowtime.id);
        liveSeats = payload?.seats || [];
      } catch (error) {
        Toast.error(error.message || 'Không thể tải trạng thái ghế');
        return;
      }
    } else {
      liveSeats = detail.seats
        .filter(seat => seat.roomId === roomId)
        .map(seat => ({ ...seat, status: 'AVAILABLE' }));
    }

    const rows = [...new Set(liveSeats.map(seat => seat.row))].sort((a, b) =>
      String(a).localeCompare(String(b), 'vi', { numeric: true }),
    );
    const bookedSeats = liveSeats.filter(seat => seat.status === 'BOOKED').length;
    const movie = activeShowtime?.movie;
    const startAt = activeShowtime ? new Date(activeShowtime.startAt) : null;
    const endAt = activeShowtime ? new Date(activeShowtime.endAt) : null;
    const timeText = activeShowtime
      ? `${startAt.toLocaleTimeString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit' })} – ${endAt.toLocaleTimeString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit' })}`
      : '';

    const content = `
      <div class="admin-room-seat-map admin-room-live-status">
        ${activeShowtime ? `
          <div class="admin-room-now-playing">
            ${movie?.posterUrl ? `<img src="${Helpers.escapeHtml(movie.posterUrl)}" alt="${Helpers.escapeHtml(movie.title || '')}" />` : `<span class="admin-room-now-playing-icon"><i class="fas fa-film"></i></span>`}
            <div>
              <small><i class="fas fa-circle"></i> Đang chiếu</small>
              <strong>${Helpers.escapeHtml(movie?.title || 'Chưa rõ tên phim')}</strong>
              <span>${Helpers.escapeHtml(room.name)} · ${timeText}</span>
            </div>
            <div class="admin-room-live-counts">
              <span><b>${bookedSeats}</b> ghế đã đặt</span>
            </div>
          </div>` : `
          <div class="admin-room-no-showtime">
            <i class="fas fa-circle-info"></i>
            <div><strong>${Helpers.escapeHtml(room.name)} hiện không có phim đang chiếu</strong><span>Sơ đồ bên dưới đang hiển thị cấu trúc ghế của phòng.</span></div>
          </div>`}
        <div class="admin-room-screen"><span>Màn hình</span></div>
        <div class="admin-room-seat-map-scroll">
          ${rows.map(row => `<div class="admin-room-seat-row"><span>${Helpers.escapeHtml(row)}</span><div>${liveSeats.filter(seat => seat.row === row).sort((a, b) => a.position - b.position).map(seat => {
            const status = String(seat.status || 'AVAILABLE').toLowerCase();
            const classes = [seat.type === 'COUPLE' ? 'couple' : '', status].filter(Boolean).join(' ');
            const statusLabel = { booked: 'Đã đặt', held: 'Đang giữ', available: 'Còn trống' }[status] || status;
            return `<span class="admin-room-seat ${classes}" title="Ghế ${Helpers.escapeHtml(row)}${seat.number} · ${statusLabel}">${seat.number}</span>`;
          }).join('')}</div><span>${Helpers.escapeHtml(row)}</span></div>`).join('') || '<div class="admin-table-empty">Phòng chưa có sơ đồ ghế</div>'}
        </div>
        <div class="admin-room-seat-legend admin-room-live-legend">
          <span><i class="available"></i> Còn trống</span>
          <span><i class="held"></i> Đang giữ</span>
          <span><i class="booked"></i> Đã đặt</span>
        </div>
      </div>`;
    Modal.show('Trạng Thái Phòng Chiếu', content, { size: 'xl', className: 'admin-room-seat-modal' });
  },

  showRoomEdit(roomId) {
    const detail = this._adminCinemaDetail;
    if (!detail) return;
    RoomView._adminRooms = detail.rooms;
    RoomView._returnCinemaId = detail.id;
    RoomView.showEditForm(roomId);
  },

  _ticketPriceText(ticketPrices) {
    const prices = Object.fromEntries(ticketPrices.map((item) => [item.seatType, Number(item.price)]));
    return [
      `Thường ${Helpers.formatCurrency(prices.STANDARD || 0)}`,
      `Đôi ${Helpers.formatCurrency(prices.COUPLE || 0)}`,
    ].join(' | ');
  },

  async showTicketPriceForm(cinemaId) {
    let prices = [];
    try {
      prices = await API.getCinemaTicketPrices(cinemaId);
    } catch (error) {
      Toast.error(error.message || 'Không thể tải bảng giá');
      return;
    }
    const byType = Object.fromEntries(prices.map((price) => [price.seatType, Number(price.price)]));
    const content = `
      <form id="cinema-ticket-price-form" onsubmit="CinemaView.saveTicketPrices(event, '${cinemaId}')">
        <div class="form-group">
          <label class="form-label">Ghế Thường (VND)</label>
          <input class="form-control" id="price-standard" type="number" min="0" step="1000" value="${byType.STANDARD || 0}" required />
        </div>
        <div class="form-group">
          <label class="form-label">Ghế Đôi (VND)</label>
          <input class="form-control" id="price-couple" type="number" min="0" step="1000" value="${byType.COUPLE || 0}" required />
        </div>
        <p style="font-size:0.82rem;color:var(--color-text-muted);">Giá này áp dụng ngay cho ghế chưa thanh toán và các suất chiếu mới.</p>
        <button type="submit" class="btn btn-primary btn-block">Lưu Bảng Giá</button>
      </form>`;
    Modal.show('Bảng Giá Vé Theo Rạp', content, { size: 'md' });
  },

  async saveTicketPrices(event, cinemaId) {
    event.preventDefault();
    const payloads = [
      { seatType: 'STANDARD', price: Number(document.getElementById('price-standard').value), isActive: true },
      { seatType: 'COUPLE', price: Number(document.getElementById('price-couple').value), isActive: true },
    ];
    try {
      await Promise.all(payloads.map((payload) => API.upsertCinemaTicketPrice(cinemaId, payload)));
      Modal.close();
      Toast.success('Đã cập nhật bảng giá vé');
      this.renderAdmin();
    } catch (error) {
      Toast.error(error.message || 'Không thể lưu bảng giá');
    }
  },

  showEditForm(cinemaId) {
    const cinema = (this._adminCinemas || []).find((item) => item.id === cinemaId) || CinemaModel.getById(cinemaId);
    if (!cinema) {
      Toast.error('Không tìm thấy rạp chiếu');
      return;
    }
    const content = `
      <form onsubmit="CinemaView.saveEdit(event, '${cinema.id}')">
        <div class="admin-form-grid">
          <div class="form-group">
            <label class="form-label">Mã chi nhánh</label>
            <input class="form-control" id="edit-cinema-code" value="${Helpers.escapeHtml(cinema.code || '')}" placeholder="CR01" />
          </div>
          <div class="form-group">
            <label class="form-label">Tên chi nhánh *</label>
            <input class="form-control" id="edit-cinema-name" value="${Helpers.escapeHtml(cinema.name || '')}" required />
          </div>
          <div class="form-group form-full">
            <label class="form-label">Địa chỉ</label>
            <input class="form-control" id="edit-cinema-address" value="${Helpers.escapeHtml(cinema.address || '')}" />
          </div>
          <div class="form-group">
            <label class="form-label">Phường/Quận</label>
            <input class="form-control" id="edit-cinema-ward" value="${Helpers.escapeHtml(cinema.ward || '')}" />
          </div>
          <div class="form-group">
            <label class="form-label">Thành phố</label>
            <input class="form-control" id="edit-cinema-city" value="${Helpers.escapeHtml(cinema.city || 'Đà Nẵng')}" />
          </div>
          <div class="form-group">
            <label class="form-label">Số điện thoại</label>
            <input class="form-control" id="edit-cinema-phone" value="${Helpers.escapeHtml(cinema.phone || '')}" />
          </div>
          <div class="form-group">
            <label class="form-label">Email</label>
            <input type="email" class="form-control" id="edit-cinema-email" value="${Helpers.escapeHtml(cinema.email || '')}" />
          </div>
          <div class="form-group form-full">
            <label class="form-label">Ảnh rạp</label>
            <input class="form-control" id="edit-cinema-image-url" value="${Helpers.escapeHtml(cinema.imageUrl || cinema.image || '')}" placeholder="/assets/images/cinemas/cr01-riverside.jpg" />
          </div>
        </div>
        <div style="display:flex;gap:12px;justify-content:flex-end;margin-top:16px;">
          <button type="button" class="btn btn-secondary" onclick="Modal.close()">Hủy</button>
          <button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> Lưu thay đổi</button>
        </div>
      </form>`;
    Modal.show('Chỉnh Sửa Rạp Chiếu', content, { size: 'lg' });
  },

  async saveEdit(event, cinemaId) {
    event.preventDefault();
    const email = document.getElementById('edit-cinema-email').value.trim();
    const payload = {
      code: document.getElementById('edit-cinema-code').value.trim() || null,
      name: document.getElementById('edit-cinema-name').value.trim(),
      address: document.getElementById('edit-cinema-address').value.trim() || null,
      ward: document.getElementById('edit-cinema-ward').value.trim() || null,
      city: document.getElementById('edit-cinema-city').value.trim() || 'Đà Nẵng',
      phone: document.getElementById('edit-cinema-phone').value.trim() || null,
      email: email || null,
      imageUrl: document.getElementById('edit-cinema-image-url').value.trim() || null,
    };
    if (!payload.name) {
      Toast.error('Vui lòng nhập tên rạp');
      return;
    }
    try {
      await API.updateAdminCinema(cinemaId, payload);
      Modal.close();
      Toast.success('Đã cập nhật rạp chiếu');
      if (this._adminCinemaDetail?.id === cinemaId) {
        this.renderAdminDetail({ id: cinemaId });
      } else {
        this.renderAdmin();
      }
    } catch (error) {
      Toast.error(error.message || 'Không thể cập nhật rạp chiếu');
    }
  }
};
