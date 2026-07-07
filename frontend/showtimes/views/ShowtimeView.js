/* CineTicket - Showtime View */
const ShowtimeView = {
  _selectedDate: null,
  _selectedCinema: null,

  renderForMovie(movieId, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const dates = ShowtimeModel.getAvailableDates(movieId);
    if (dates.length === 0) {
      container.innerHTML = '<p style="color:var(--color-text-muted);">Khong co suat chieu nao cho phim nay.</p>';
      return;
    }

    this._selectedDate = dates[0];
    this._selectedCinema = null;
    const chains = CinemaModel.getChains();

    container.innerHTML = `
      <div class="date-picker" id="showtime-date-picker">
        ${dates.map(d => {
          const dt = new Date(d);
          return `<button class="date-btn ${d === this._selectedDate ? 'active' : ''}"
            onclick="ShowtimeView._selectDate('${movieId}', '${d}', '${containerId}', this)">
            <div class="date-day">${Helpers.getDayName(d)}</div>
            <div class="date-num">${dt.getDate()}</div>
            <div class="date-month">Thang ${dt.getMonth() + 1}</div>
          </button>`;
        }).join('')}
      </div>

      <div class="cinema-tabs" id="showtime-cinema-tabs" style="margin-top:20px;">
        <button class="cinema-tab active" onclick="ShowtimeView._selectCinema('${movieId}', null, '${containerId}', this)">Tat Ca Rap</button>
        ${chains.map(chain => `
          <button class="cinema-tab" onclick="ShowtimeView._selectCinema('${movieId}', '${chain.id}', '${containerId}', this)">
            ${Helpers.escapeHtml(chain.name)}
          </button>`).join('')}
      </div>

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

  _selectCinema(movieId, chainId, containerId, btn) {
    this._selectedCinema = chainId;
    document.querySelectorAll('#showtime-cinema-tabs .cinema-tab').forEach(b => b.classList.remove('active'));
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
      listEl.innerHTML = `<div class="empty-state" style="padding:40px 0;"><i class="fas fa-calendar-times"></i><h3>Khong co suat chieu</h3><p>Thu chon ngay hoac rap khac.</p></div>`;
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
              <div class="showtime-room-label">${cinema ? Helpers.escapeHtml(cinema.name) : cinemaId}</div>
              <div class="showtime-movie-meta" style="margin-bottom:10px;">
                <span><i class="fas fa-map-marker-alt"></i> ${cinema ? Helpers.escapeHtml(cinema.address) : ''}</span>
              </div>
              <div class="showtime-times">
                ${shows.sort((a, b) => a.startTime.localeCompare(b.startTime)).map((showtime) => {
                  const fillPct = showtime.totalSeats ? showtime.bookedSeats / showtime.totalSeats : 0;
                  const almostFull = fillPct > 0.7;
                  return `<button class="showtime-btn ${almostFull ? 'almost-full' : ''}" onclick="Router.navigate('/seats/${showtime.id}')">
                    <span class="showtime-btn-time">${showtime.startTime}</span>
                    <span class="showtime-btn-end">-> ${showtime.endTime}</span>
                    <span class="showtime-btn-price">${Helpers.formatCurrency(showtime.price.normal)}</span>
                    ${almostFull ? `<span style="font-size:0.65rem;color:var(--color-warning);">Sap het</span>` : ''}
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
        ${UserView._renderAdminTopbar('Quan Ly Lich Chieu', 'admin/showtimes')}
        <div class="admin-content">
          <div class="admin-page-header">
            <div>
              <h1 class="admin-page-title">Lich Chieu</h1>
              <p class="admin-page-subtitle">${API.mockData.showtimes.length} suat chieu trong he thong</p>
            </div>
            <div class="admin-page-actions">
              <button class="btn btn-primary" onclick="Toast.info('Tinh nang them lich chieu dang phat trien')"><i class="fas fa-plus"></i> Them Lich Chieu</button>
            </div>
          </div>
          <div class="admin-table-card">
            <div class="admin-table-header">
              <span class="admin-table-title">Danh Sach Lich Chieu (50 gan nhat)</span>
              <div class="admin-table-actions">
                <input type="text" class="form-control" placeholder="Tim kiem..." style="width:200px;" oninput="ShowtimeView._filterTable(this.value)" />
              </div>
            </div>
            <div class="table-wrapper">
              <table class="admin-table">
                <thead><tr>
                  <th>Phim</th><th>Chuoi Rap</th><th>Chi Nhanh</th><th>Phong</th><th>Ngay</th><th>Gio</th><th>Gia</th><th>Dat/Tong</th><th>Hanh Dong</th>
                </tr></thead>
                <tbody id="showtimes-admin-tbody">
                  ${showtimes.map(s => {
                    const movie = MovieModel.getById(s.movieId);
                    const cinema = CinemaModel.getById(s.cinemaId);
                    const room = RoomModel.getById(s.roomId);
                    const fillPct = s.totalSeats ? Math.round((s.bookedSeats / s.totalSeats) * 100) : 0;
                    return `<tr>
                      <td style="font-size:0.8rem;">${movie ? Helpers.escapeHtml(Helpers.truncate(movie.title, 30)) : s.movieId}</td>
                      <td style="font-size:0.8rem;">${s.chain ? Helpers.escapeHtml(s.chain.name) : ''}</td>
                      <td style="font-size:0.8rem;">${cinema ? Helpers.escapeHtml(cinema.shortName) : s.cinemaId}</td>
                      <td><span class="badge badge-secondary" style="font-size:0.65rem;">${room ? Helpers.escapeHtml(room.name) : ''}</span></td>
                      <td>${s.date}</td>
                      <td><strong>${s.startTime}</strong> - ${s.endTime}</td>
                      <td style="color:var(--color-accent);font-weight:600;">${Helpers.formatCurrency(s.price.normal)}</td>
                      <td>
                        <div style="font-size:0.8rem;">${s.bookedSeats}/${s.totalSeats}</div>
                        <div class="progress" style="margin-top:4px;"><div class="progress-bar" style="width:${fillPct}%;background:${fillPct>80?'var(--color-danger)':fillPct>50?'var(--color-warning)':'var(--color-success)'}"></div></div>
                      </td>
                      <td><div class="table-actions">
                        <button class="action-btn delete" onclick="ShowtimeController.handleDelete('${s.id}')" title="Xoa"><i class="fas fa-trash"></i></button>
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
  },
};
