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
    const cinemas = CinemaModel.getAll();

    container.innerHTML = `
      <!-- Date Picker -->
      <div class="date-picker" id="showtime-date-picker">
        ${dates.map(d => {
          const dt = new Date(d);
          return `<button class="date-btn ${d === this._selectedDate ? 'active' : ''}"
            onclick="ShowtimeView._selectDate('${movieId}', '${d}', '${containerId}', this)">
            <div class="date-day">${Helpers.getDayName(d)}</div>
            <div class="date-num">${dt.getDate()}</div>
            <div class="date-month">Tháng ${dt.getMonth() + 1}</div>
          </button>`;
        }).join('')}
      </div>

      <!-- Cinema Tabs -->
      <div class="cinema-tabs" id="showtime-cinema-tabs" style="margin-top:20px;">
        <button class="cinema-tab active" onclick="ShowtimeView._selectCinema('${movieId}', null, '${containerId}', this)">Tất Cả Rạp</button>
        ${cinemas.map(c => `
          <button class="cinema-tab" onclick="ShowtimeView._selectCinema('${movieId}', '${c.id}', '${containerId}', this)">
            ${Helpers.escapeHtml(c.shortName)}
          </button>`).join('')}
      </div>

      <!-- Showtime List -->
      <div id="showtime-list-${containerId}" style="margin-top:16px;"></div>
    `;
    this._renderShowtimeList(movieId, containerId);
  },

  _selectDate(movieId, date, containerId, btn) {
    this._selectedDate = date;
    document.querySelectorAll('#showtime-date-picker .date-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    this._renderShowtimeList(movieId, containerId);
  },

  _selectCinema(movieId, cinemaId, containerId, btn) {
    this._selectedCinema = cinemaId;
    document.querySelectorAll('#showtime-cinema-tabs .cinema-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    this._renderShowtimeList(movieId, containerId);
  },

  _renderShowtimeList(movieId, containerId) {
    const listEl = document.getElementById(`showtime-list-${containerId}`);
    if (!listEl) return;
    const showtimes = ShowtimeModel.getByFilters({
      movieId,
      cinemaId: this._selectedCinema,
      date: this._selectedDate
    });
    if (showtimes.length === 0) {
      listEl.innerHTML = `<div class="empty-state" style="padding:40px 0;"><i class="fas fa-calendar-times"></i><h3>Không có suất chiếu</h3><p>Thử chọn ngày hoặc rạp khác.</p></div>`;
      return;
    }
    // Group by cinema
    const byCinema = {};
    showtimes.forEach(s => {
      if (!byCinema[s.cinemaId]) byCinema[s.cinemaId] = [];
      byCinema[s.cinemaId].push(s);
    });
    listEl.innerHTML = Object.entries(byCinema).map(([cinemaId, shows]) => {
      const cinema = CinemaModel.getById(cinemaId);
      const byRoom = {};
      shows.forEach(s => {
        if (!byRoom[s.roomId]) byRoom[s.roomId] = [];
        byRoom[s.roomId].push(s);
      });
      return `
      <div class="showtime-movie-item">
        <div class="showtime-movie-header">
          <div class="showtime-movie-info">
            <div class="showtime-movie-title"><i class="fas fa-building" style="color:var(--color-primary);"></i> ${Helpers.escapeHtml(cinema ? cinema.name : cinemaId)}</div>
            <div class="showtime-movie-meta">
              <span><i class="fas fa-map-marker-alt"></i> ${cinema ? Helpers.escapeHtml(cinema.address) : ''}</span>
            </div>
          </div>
        </div>
        <div class="showtime-rooms">
          ${Object.entries(byRoom).map(([roomId, roomShows]) => {
            const room = RoomModel.getById(roomId);
            return `
            <div class="showtime-room-group">
              <div class="showtime-room-label">${room ? Helpers.escapeHtml(room.name) : roomId}</div>
              <div class="showtime-times">
                ${roomShows.sort((a,b) => a.startTime.localeCompare(b.startTime)).map(s => {
                  const fillPct = s.bookedSeats / s.totalSeats;
                  const almostFull = fillPct > 0.7;
                  return `<button class="showtime-btn ${almostFull ? 'almost-full' : ''}" onclick="Router.navigate('/seats/${s.id}')">
                    <span class="showtime-btn-time">${s.startTime}</span>
                    <span class="showtime-btn-end">→ ${s.endTime}</span>
                    <span class="showtime-btn-price">${Helpers.formatCurrency(s.price.normal)}</span>
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

  renderAdmin() {
    if (!AuthController.requireAdmin()) return;
    document.body.classList.add('admin-layout');
    const showtimes = ShowtimeModel.getAll().slice(0, 50);
    const main = document.getElementById('main-content');
    if (!main) return;
    main.innerHTML = `
    <div class="admin-layout-wrap">
      ${UserView._renderAdminSidebar('showtimes')}
      <div class="admin-main">
        ${UserView._renderAdminTopbar('Quản Lý Lịch Chiếu', 'admin/showtimes')}
        <div class="admin-content">
          <div class="admin-page-header">
            <div>
              <h1 class="admin-page-title">Lịch Chiếu</h1>
              <p class="admin-page-subtitle">${API.mockData.showtimes.length} suất chiếu trong hệ thống</p>
            </div>
            <div class="admin-page-actions">
              <button class="btn btn-primary" onclick="Toast.info('Tính năng thêm lịch chiếu đang phát triển')"><i class="fas fa-plus"></i> Thêm Lịch Chiếu</button>
            </div>
          </div>
          <div class="admin-table-card">
            <div class="admin-table-header">
              <span class="admin-table-title">Danh Sách Lịch Chiếu (50 gần nhất)</span>
              <div class="admin-table-actions">
                <input type="text" class="form-control" placeholder="Tìm kiếm..." style="width:200px;" oninput="ShowtimeView._filterTable(this.value)" />
              </div>
            </div>
            <div class="table-wrapper">
              <table class="admin-table">
                <thead><tr>
                  <th>Phim</th><th>Rạp</th><th>Phòng</th><th>Ngày</th><th>Giờ Chiếu</th><th>Giá/Vé</th><th>Đặt/Tổng</th><th>Hành Động</th>
                </tr></thead>
                <tbody id="showtimes-admin-tbody">
                  ${showtimes.map(s => {
                    const movie = MovieModel.getById(s.movieId);
                    const cinema = CinemaModel.getById(s.cinemaId);
                    const room = RoomModel.getById(s.roomId);
                    const fillPct = Math.round((s.bookedSeats / s.totalSeats) * 100);
                    return `<tr>
                      <td style="font-size:0.8rem;">${movie ? Helpers.escapeHtml(Helpers.truncate(movie.title, 30)) : s.movieId}</td>
                      <td style="font-size:0.8rem;">${cinema ? Helpers.escapeHtml(cinema.shortName) : s.cinemaId}</td>
                      <td><span class="badge badge-secondary" style="font-size:0.65rem;">${room ? room.type : ''}</span></td>
                      <td>${s.date}</td>
                      <td><strong>${s.startTime}</strong> – ${s.endTime}</td>
                      <td style="color:var(--color-accent);font-weight:600;">${Helpers.formatCurrency(s.price.normal)}</td>
                      <td>
                        <div style="font-size:0.8rem;">${s.bookedSeats}/${s.totalSeats}</div>
                        <div class="progress" style="margin-top:4px;"><div class="progress-bar" style="width:${fillPct}%;background:${fillPct>80?'var(--color-danger)':fillPct>50?'var(--color-warning)':'var(--color-success)'}"></div></div>
                      </td>
                      <td><div class="table-actions">
                        <button class="action-btn delete" onclick="ShowtimeController.handleDelete('${s.id}')" title="Xóa"><i class="fas fa-trash"></i></button>
                      </div></td>
                    </tr>`;
                  }).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>`;
  },

  _filterTable(query) {
    const tbody = document.getElementById('showtimes-admin-tbody');
    if (!tbody) return;
    tbody.querySelectorAll('tr').forEach(row => {
      row.style.display = row.textContent.toLowerCase().includes(query.toLowerCase()) ? '' : 'none';
    });
  }
};
