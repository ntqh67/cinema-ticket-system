/* CineTicket - Showtime View */
const ShowtimeView = {
  _selectedDate: null,
  _selectedCinema: null,

  renderForMovie(movieId, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const dates = ShowtimeModel.getAvailableDates(movieId);
    if (dates.length === 0) {
      container.innerHTML = '<p style="color:var(--color-text-muted);">Không có suất chiếu nào cho phim này.</p>';
      return;
    }

    this._selectedDate = dates[0];
    this._selectedCinema = null;
    const chains = CinemaModel.getChains();

    container.innerHTML = `
      <div class="date-picker" id="showtime-date-picker">
        ${dates.map((date) => {
          const dt = new Date(date);
          return `<button class="date-btn ${date === this._selectedDate ? 'active' : ''}"
            onclick="ShowtimeView._selectDate('${movieId}', '${date}', '${containerId}', this)">
            <div class="date-day">${Helpers.getDayName(date)}</div>
            <div class="date-num">${dt.getDate()}</div>
            <div class="date-month">Tháng ${dt.getMonth() + 1}</div>
          </button>`;
        }).join('')}
      </div>

      <div class="cinema-tabs" id="showtime-cinema-tabs" style="margin-top:20px;">
        <button class="cinema-tab active" onclick="ShowtimeView._selectCinema('${movieId}', null, '${containerId}', this)">Tất Cả Rạp</button>
        ${chains.map((chain) => `
          <button class="cinema-tab" onclick="ShowtimeView._selectCinema('${movieId}', '${chain.id}', '${containerId}', this)">
            ${Helpers.escapeHtml(chain.name)}
          </button>`).join('')}
      </div>

      <div id="showtime-list-${containerId}" style="margin-top:16px;"></div>`;
    this._renderShowtimeList(movieId, containerId);
  },

  _selectDate(movieId, date, containerId, btn) {
    this._selectedDate = date;
    document.querySelectorAll('#showtime-date-picker .date-btn').forEach((item) => item.classList.remove('active'));
    btn.classList.add('active');
    this._renderShowtimeList(movieId, containerId);
  },

  _selectCinema(movieId, chainId, containerId, btn) {
    this._selectedCinema = chainId;
    document.querySelectorAll('#showtime-cinema-tabs .cinema-tab').forEach((item) => item.classList.remove('active'));
    btn.classList.add('active');
    this._renderShowtimeList(movieId, containerId);
  },

  _renderShowtimeList(movieId, containerId) {
    const listEl = document.getElementById(`showtime-list-${containerId}`);
    if (!listEl) return;
    const showtimes = ShowtimeModel.getByFilters({
      movieId,
      chainId: this._selectedCinema,
      date: this._selectedDate,
    });

    if (showtimes.length === 0) {
      listEl.innerHTML = `<div class="empty-state" style="padding:40px 0;"><i class="fas fa-calendar-times"></i><h3>Không có suất chiếu</h3><p>Thử chọn ngày hoặc rạp khác.</p></div>`;
      return;
    }

    const byChain = {};
    showtimes.forEach((showtime) => {
      const chainId = showtime.chainId || showtime.cinemaId;
      if (!byChain[chainId]) byChain[chainId] = [];
      byChain[chainId].push(showtime);
    });

    listEl.innerHTML = Object.entries(byChain).map(([chainId, chainShows]) => {
      const chain = chainShows[0].chain || { id: chainId, name: chainId };
      const byCinema = {};
      chainShows.forEach((showtime) => {
        if (!byCinema[showtime.cinemaId]) byCinema[showtime.cinemaId] = [];
        byCinema[showtime.cinemaId].push(showtime);
      });

      return `
      <div class="showtime-movie-item">
        <div class="showtime-movie-header">
          <div class="showtime-movie-info">
            <div class="showtime-movie-title">
              <i class="fas fa-building" style="color:var(--color-primary);"></i>
              ${Helpers.escapeHtml(chain.name)}
            </div>
          </div>
        </div>
        <div class="showtime-rooms">
          ${Object.entries(byCinema).map(([cinemaId, shows]) => {
            const cinema = CinemaModel.getById(cinemaId);
            return `
            <div class="showtime-room-group">
              <div class="showtime-room-label">${cinema ? Helpers.escapeHtml(cinema.name) : Helpers.escapeHtml(cinemaId)}</div>
              <div class="showtime-movie-meta" style="margin-bottom:10px;">
                <span><i class="fas fa-map-marker-alt"></i> ${cinema ? Helpers.escapeHtml(cinema.address) : ''}</span>
              </div>
              <div class="showtime-times">
                ${shows.sort((a, b) => a.startTime.localeCompare(b.startTime)).map((showtime) => {
                  const fillPct = showtime.totalSeats ? showtime.bookedSeats / showtime.totalSeats : 0;
                  const almostFull = fillPct > 0.7;
                  return `<button class="showtime-btn ${almostFull ? 'almost-full' : ''}" onclick="Router.navigate('/seats/${showtime.id}')">
                    <span class="showtime-btn-time">${showtime.startTime}</span>
                    <span class="showtime-btn-end">→ ${showtime.endTime}</span>
                    <span class="showtime-btn-price">${Helpers.formatCurrency(showtime.price.normal)}</span>
                    ${almostFull ? `<span style="font-size:0.65rem;color:var(--color-warning);">Sắp hết</span>` : ''}
                  </button>`;
                }).join('')}
              </div>
            </div>`;
          }).join('')}
        </div>
      </div>`;
    }).join('');
  },

  async renderAdmin() {
    if (!AuthController.requireAdmin()) return;
    document.body.classList.add('admin-layout');
    const main = document.getElementById('main-content');
    if (!main) return;

    let showtimes = [];
    try {
      showtimes = await API.getAdminShowtimes();
    } catch (error) {
      Toast.error(error.message || 'Không thể tải lịch chiếu');
      showtimes = ShowtimeModel.getAll();
    }
    showtimes = showtimes.slice(0, 100);

    main.innerHTML = `
    <div class="admin-layout-wrap">
      ${UserView._renderAdminSidebar('showtimes')}
      <div class="admin-main">
        ${UserView._renderAdminTopbar('Quản Lý Lịch Chiếu', 'admin/showtimes')}
        <div class="admin-content">
          <div class="admin-page-header">
            <div>
              <h1 class="admin-page-title">Lịch Chiếu</h1>
              <p class="admin-page-subtitle">${showtimes.length} suất chiếu gần nhất</p>
            </div>
            <div class="admin-page-actions">
              <button class="btn btn-primary" onclick="ShowtimeView._showAddForm()"><i class="fas fa-plus"></i> Thêm Lịch Chiếu</button>
            </div>
          </div>
          <div class="admin-table-card">
            <div class="admin-table-header">
              <span class="admin-table-title">Danh Sách Lịch Chiếu</span>
              <div class="admin-table-actions">
                <input type="text" class="form-control" placeholder="Tìm kiếm..." style="width:200px;" oninput="ShowtimeView._filterTable(this.value)" />
              </div>
            </div>
            <div class="table-wrapper">
              <table class="admin-table">
                <thead>
                  <tr>
                    <th>Phim</th><th>Chuỗi Rạp</th><th>Chi Nhánh</th><th>Phòng</th><th>Ngày</th><th>Giờ</th><th>Giá</th><th>Đặt/Tổng</th><th>Hành Động</th>
                  </tr>
                </thead>
                <tbody id="showtimes-admin-tbody">
                  ${showtimes.map((showtime) => this._adminShowtimeRow(showtime)).join('') || '<tr><td colspan="9" class="admin-table-empty">Chưa có lịch chiếu</td></tr>'}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>`;
  },

  _adminShowtimeRow(showtime) {
    const movie = showtime.movie || MovieModel.getById(showtime.movieId);
    const cinema = showtime.cinema || CinemaModel.getById(showtime.cinemaId);
    const room = showtime.room || RoomModel.getById(showtime.roomId);
    const startAt = showtime.startAt || `${showtime.date}T${showtime.startTime}`;
    const endAt = showtime.endAt || `${showtime.date}T${showtime.endTime}`;
    const fillPct = showtime.totalSeats ? Math.round((showtime.bookedSeats / showtime.totalSeats) * 100) : 0;
    const price = showtime.price?.normal || showtime.basePrice || 0;

    return `<tr>
      <td style="font-size:0.8rem;">${movie ? Helpers.escapeHtml(Helpers.truncate(movie.title, 30)) : Helpers.escapeHtml(showtime.movieId || '')}</td>
      <td style="font-size:0.8rem;">${showtime.chain ? Helpers.escapeHtml(showtime.chain.name) : ''}</td>
      <td style="font-size:0.8rem;">${cinema ? Helpers.escapeHtml(cinema.name || cinema.shortName) : Helpers.escapeHtml(showtime.cinemaId || '')}</td>
      <td><span class="badge badge-secondary" style="font-size:0.65rem;">${room ? Helpers.escapeHtml(room.name) : ''}</span></td>
      <td>${Helpers.formatDate(startAt)}</td>
      <td><strong>${this._time(startAt)}</strong> - ${this._time(endAt)}</td>
      <td style="color:var(--color-accent);font-weight:600;">${Helpers.formatCurrency(price)}</td>
      <td>
        <div style="font-size:0.8rem;">${showtime.bookedSeats || 0}/${showtime.totalSeats || 0}</div>
        <div class="progress" style="margin-top:4px;"><div class="progress-bar" style="width:${fillPct}%;background:${fillPct>80?'var(--color-danger)':fillPct>50?'var(--color-warning)':'var(--color-success)'}"></div></div>
      </td>
      <td>
        <div class="table-actions">
          <button class="action-btn delete" onclick="ShowtimeController.handleDelete('${showtime.id}')" title="Xóa"><i class="fas fa-trash"></i></button>
        </div>
      </td>
    </tr>`;
  },

  _time(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value).slice(0, 5);
    return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  },

  _filterTable(query) {
    const tbody = document.getElementById('showtimes-admin-tbody');
    if (!tbody) return;
    tbody.querySelectorAll('tr').forEach((row) => {
      row.style.display = row.textContent.toLowerCase().includes(query.toLowerCase()) ? '' : 'none';
    });
  },

  _showAddForm() {
    const movies = MovieModel.getAll();
    const cinemas = CinemaModel.getAll();
    const today = Helpers.getDateString(new Date());
    const content = `
      <form onsubmit="ShowtimeController.handleCreate(event)">
        <div class="admin-form-grid">
          <div class="form-group form-full">
            <label class="form-label">Phim</label>
            <select class="form-control" id="showtime-movie-id" required>
              <option value="">Chọn phim</option>
              ${movies.map((movie) => `<option value="${movie.id}">${Helpers.escapeHtml(movie.title)} (${movie.status === 'comingSoon' ? 'Sắp chiếu' : 'Đang chiếu'})</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Rạp / Chi nhánh</label>
            <select class="form-control" id="showtime-cinema-id" onchange="ShowtimeView._updateRoomOptions()" required>
              <option value="">Chọn rạp</option>
              ${cinemas.map((cinema) => `<option value="${cinema.id}">${Helpers.escapeHtml(cinema.name)}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Phòng</label>
            <select class="form-control" id="showtime-room-id" required>
              <option value="">Chọn phòng</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Ngày chiếu</label>
            <input class="form-control" id="showtime-date" type="date" min="${today}" value="${today}" required />
          </div>
          <div class="form-group">
            <label class="form-label">Giờ bắt đầu</label>
            <input class="form-control" id="showtime-time" type="time" value="19:00" required />
          </div>
          <div class="form-group">
            <label class="form-label">Giá ghế thường</label>
            <input class="form-control" id="showtime-base-price" type="number" min="0" step="1000" value="80000" required />
          </div>
          <div class="form-group form-full">
            <div class="alert alert-info" style="margin:0;">Hệ thống tự tính giờ kết thúc theo thời lượng phim và tự tạo ghế cho suất chiếu.</div>
          </div>
        </div>
        <div style="display:flex;gap:12px;justify-content:flex-end;margin-top:16px;">
          <button type="button" class="btn btn-secondary" onclick="Modal.close()">Hủy</button>
          <button type="submit" class="btn btn-primary"><i class="fas fa-plus"></i> Tạo Lịch Chiếu</button>
        </div>
      </form>`;
    Modal.show('Thêm Lịch Chiếu', content, { size: 'lg' });
  },

  _updateRoomOptions() {
    const cinemaId = document.getElementById('showtime-cinema-id')?.value;
    const roomSelect = document.getElementById('showtime-room-id');
    if (!roomSelect) return;
    const rooms = cinemaId ? RoomModel.getByCinema(cinemaId) : [];
    roomSelect.innerHTML = `<option value="">Chọn phòng</option>${rooms.map((room) => `<option value="${room.id}">${Helpers.escapeHtml(room.name)} (${room.capacity || 0} ghế)</option>`).join('')}`;
  },
};
