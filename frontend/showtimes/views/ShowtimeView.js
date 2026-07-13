/**
 * Mục đích: Lớp View dựng giao diện và cập nhật DOM cho miền suất chiếu.
 */
/* CineTicket - View suất chiếu */
// Đối tượng ShowtimeView đóng vai trò lớp hiển thị, dựng HTML và cập nhật DOM.
const ShowtimeView = {
  _selectedDate: null,
  _selectedCinema: null,
  _adminSelectedCinema: null,
  _adminCinemas: [],
  _adminSearchQuery: '',

  // Dựng phần giao diện tương ứng trong khối renderForMovie.
  renderForMovie(movieId, containerId) {
    const container = document.getElementById(containerId);
    // Dừng hoặc đổi hướng luồng khi dữ liệu bắt buộc chưa sẵn sàng.
    if (!container) return;
    const dates = ShowtimeModel.getAvailableDates(movieId);
    // Xử lý riêng trường hợp danh sách rỗng hoặc có số lượng không hợp lệ.
    if (dates.length === 0) {
      container.innerHTML = '<p style="color:var(--color-text-muted);">Không có suất chiếu nào cho phim này.</p>';
      return;
    }

    this._selectedDate = dates[0];
    this._selectedCinema = null;
    const cinemas = this._cinemasForMovie(movieId);

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
        <button class="cinema-tab active" onclick="ShowtimeView._selectCinema('${movieId}', null, '${containerId}', this)">Tất cả chi nhánh</button>
        ${cinemas.map((cinema) => `
          <button class="cinema-tab" onclick="ShowtimeView._selectCinema('${movieId}', '${cinema.id}', '${containerId}', this)">
            ${Helpers.escapeHtml(cinema.code ? `${cinema.code} - ${cinema.name}` : cinema.name)}
          </button>`).join('')}
      </div>

      <div id="showtime-list-${containerId}" style="margin-top:16px;"></div>`;
    this._renderShowtimeList(movieId, containerId);
  },

  // Điều phối sự kiện và phản hồi người dùng trong khối _selectDate.
  _selectDate(movieId, date, containerId, btn) {
    this._selectedDate = date;
    document.querySelectorAll('#showtime-date-picker .date-btn').forEach((item) => item.classList.remove('active'));
    btn.classList.add('active');
    this._renderShowtimeList(movieId, containerId);
  },

  // Điều phối sự kiện và phản hồi người dùng trong khối _selectCinema.
  _selectCinema(movieId, cinemaId, containerId, btn) {
    this._selectedCinema = cinemaId;
    document.querySelectorAll('#showtime-cinema-tabs .cinema-tab').forEach((item) => item.classList.remove('active'));
    btn.classList.add('active');
    this._renderShowtimeList(movieId, containerId);
  },

  // Kiểm tra điều kiện nghiệp vụ trong khối _renderShowtimeList trước khi tiếp tục.
  _renderShowtimeList(movieId, containerId) {
    const listEl = document.getElementById(`showtime-list-${containerId}`);
    // Dừng hoặc đổi hướng luồng khi dữ liệu bắt buộc chưa sẵn sàng.
    if (!listEl) return;
    const showtimes = ShowtimeModel.getByFilters({
      movieId,
      cinemaId: this._selectedCinema,
      date: this._selectedDate,
    });

    // Xử lý riêng trường hợp danh sách rỗng hoặc có số lượng không hợp lệ.
    if (showtimes.length === 0) {
      listEl.innerHTML = `<div class="empty-state" style="padding:40px 0;"><i class="fas fa-calendar-times"></i><h3>Không có suất chiếu</h3><p>Thử chọn ngày hoặc rạp khác.</p></div>`;
      return;
    }

    const byCinema = {};
    showtimes.forEach((showtime) => {
      const cinemaId = showtime.cinemaId || showtime.cinema?.id || '';
      // Dừng hoặc đổi hướng luồng khi dữ liệu bắt buộc chưa sẵn sàng.
      if (!byCinema[cinemaId]) byCinema[cinemaId] = [];
      byCinema[cinemaId].push(showtime);
    });

    listEl.innerHTML = Object.entries(byCinema).sort(([cinemaIdA], [cinemaIdB]) => {
      const cinemaA = CinemaModel.getById(cinemaIdA);
      const cinemaB = CinemaModel.getById(cinemaIdB);
      return this._compareCinema(cinemaA, cinemaB);
    }).map(([cinemaId, shows]) => {
      const cinema = CinemaModel.getById(cinemaId);
      return `
      <div class="showtime-movie-item">
        <div class="showtime-movie-header">
          <div class="showtime-movie-info">
            <div class="showtime-movie-title">
              <i class="fas fa-building" style="color:var(--color-primary);"></i>
              ${cinema ? Helpers.escapeHtml(cinema.code ? `${cinema.code} - ${cinema.name}` : cinema.name) : Helpers.escapeHtml(cinemaId)}
            </div>
            <div class="showtime-movie-meta">
              ${cinema?.ward ? `<span><i class="fas fa-map-marker-alt"></i> ${Helpers.escapeHtml(cinema.ward)}</span>` : ''}
              <span><i class="fas fa-map-marker-alt"></i> ${cinema ? Helpers.escapeHtml(cinema.address || '') : ''}</span>
            </div>
          </div>
        </div>
        <div class="showtime-rooms">
          <div class="showtime-room-group">
            <div class="showtime-room-label">Giờ chiếu trong ngày</div>
            <div class="showtime-times">
              ${shows.sort((a, b) => a.startTime.localeCompare(b.startTime)).map((showtime) => {
                const fillPct = showtime.totalSeats ? showtime.bookedSeats / showtime.totalSeats : 0;
                const almostFull = fillPct > 0.7;
                const price = showtime.price?.normal ?? showtime.basePrice ?? 0;
                return `<button class="showtime-btn ${almostFull ? 'almost-full' : ''}" onclick="Router.navigate('/seats/${showtime.id}')">
                  <span class="showtime-btn-time">${showtime.startTime}</span>
                  <span class="showtime-btn-end">→ ${showtime.endTime}</span>
                  <span class="showtime-btn-price">${Helpers.formatCurrency(price)}</span>
                  ${almostFull ? `<span style="font-size:0.65rem;color:var(--color-warning);">Sắp hết</span>` : ''}
                </button>`;
              }).join('')}
            </div>
          </div>
        </div>
      </div>`;
    }).join('');
  },

  // Dựng phần giao diện tương ứng trong khối renderAdmin.
  async renderAdmin() {
    // Kiểm tra trạng thái đăng nhập hoặc vai trò trước khi cho phép thao tác.
    if (!AuthController.requireAdmin()) return;
    document.body.classList.add('admin-layout');
    const main = document.getElementById('main-content');
    // Dừng hoặc đổi hướng luồng khi dữ liệu bắt buộc chưa sẵn sàng.
    if (!main) return;

    let showtimes = [];
    let cinemas = [];
    // Bắt đầu thao tác có thể thất bại để hiển thị phản hồi phù hợp cho người dùng.
    try {
      [showtimes, cinemas] = await Promise.all([
        API.getAdminShowtimes(),
        API.getAdminCinemas(),
      ]);
    } catch (error) {
      Toast.error(error.message || 'Không thể tải lịch chiếu');
      showtimes = ShowtimeModel.getAll();
      cinemas = CinemaModel.getAll();
    }
    cinemas.sort((a, b) => this._compareCinema(a, b));
    this._adminCinemas = cinemas;
    // Kiểm tra trạng thái đăng nhập hoặc vai trò trước khi cho phép thao tác.
    if (!this._adminSelectedCinema || !cinemas.some((cinema) => cinema.id === this._adminSelectedCinema)) {
      this._adminSelectedCinema = cinemas[0]?.id || '';
    }
    const selectedCinema = cinemas.find((cinema) => cinema.id === this._adminSelectedCinema);
    const showtimesByCinema = this._adminSelectedCinema
      ? showtimes.filter((showtime) => this._showtimeCinemaId(showtime) === this._adminSelectedCinema)
      : [];
    const filteredShowtimes = this._filterAdminShowtimes(showtimesByCinema, this._adminSearchQuery);

    main.innerHTML = `
    <div class="admin-layout-wrap">
      ${UserView._renderAdminSidebar('showtimes')}
      <div class="admin-main">
        ${UserView._renderAdminTopbar('Quản Lý Lịch Chiếu', 'admin/showtimes')}
        <div class="admin-content">
          <div class="admin-page-header">
            <div>
              <h1 class="admin-page-title">Lịch Chiếu</h1>
              <p class="admin-page-subtitle">${selectedCinema ? Helpers.escapeHtml(selectedCinema.name) : 'Chưa chọn rạp'} - ${filteredShowtimes.length} suất chiếu</p>
            </div>
            <div class="admin-page-actions">
              <select class="form-control" style="width:260px;" onchange="ShowtimeView.selectAdminCinema(this.value)">
                ${cinemas.map((cinema) => `<option value="${cinema.id}" ${cinema.id === this._adminSelectedCinema ? 'selected' : ''}>${Helpers.escapeHtml(cinema.code ? `${cinema.code} - ${cinema.name}` : cinema.name)}</option>`).join('')}
              </select>
              <button class="btn btn-primary" onclick="ShowtimeView._showAddForm()"><i class="fas fa-plus"></i> Thêm Lịch Chiếu</button>
            </div>
          </div>
          <div class="admin-table-card">
            <div class="admin-table-header">
              <span class="admin-table-title">Danh Sách Lịch Chiếu</span>
              <div class="admin-table-actions">
                <input id="showtime-admin-search" type="text" class="form-control" placeholder="Tìm theo phim, rạp, phòng..." style="width:260px;" value="${Helpers.escapeHtml(this._adminSearchQuery)}" oninput="ShowtimeView.setAdminSearch(this.value)" />
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
                  ${filteredShowtimes.map((showtime) => this._adminShowtimeRow(showtime)).join('') || `<tr><td colspan="9" class="admin-table-empty">${this._adminSearchQuery ? 'Không có lịch chiếu phù hợp' : 'Chưa có lịch chiếu cho rạp đang chọn'}</td></tr>`}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>`;
  },

  // Điều phối sự kiện và phản hồi người dùng trong khối selectAdminCinema.
  selectAdminCinema(cinemaId) {
    this._adminSelectedCinema = cinemaId;
    this.renderAdmin();
  },

  // Cập nhật trạng thái hoặc dữ liệu trong khối setAdminSearch.
  setAdminSearch(query) {
    this._adminSearchQuery = query || '';
    this.renderAdmin();
  },

  // Dựng phần giao diện tương ứng trong khối _showtimeCinemaId.
  _showtimeCinemaId(showtime) {
    return showtime.cinemaId || showtime.cinema?.id || showtime.room?.cinemaId || '';
  },

  // Dựng phần giao diện tương ứng trong khối _adminShowtimeRow.
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
      <td><strong>${Helpers.formatTimeOfDay(startAt)}</strong> - ${Helpers.formatTimeOfDay(endAt)}</td>
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
  // Dựng phần giao diện tương ứng trong khối _filterAdminShowtimes.
  _filterAdminShowtimes(showtimes, query) {
    const normalized = this._normalize(query);
    // Dừng hoặc đổi hướng luồng khi dữ liệu bắt buộc chưa sẵn sàng.
    if (!normalized) return showtimes;
    return showtimes.filter((showtime) => {
      const movie = showtime.movie || MovieModel.getById(showtime.movieId);
      const cinema = showtime.cinema || CinemaModel.getById(showtime.cinemaId);
      const room = showtime.room || RoomModel.getById(showtime.roomId);
      const searchable = [
        movie?.title,
        cinema?.code,
        cinema?.name,
        room?.name,
        showtime.chain?.name,
      ].filter(Boolean).join(' ');
      return this._normalize(searchable).includes(normalized);
    });
  },

  // Chuẩn hóa dữ liệu đầu vào/đầu ra trong khối _normalize.
  _normalize(value) {
    return String(value || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  },

  // Thực hiện trách nhiệm riêng của khối _compareCinema.
  _compareCinema(a, b) {
    return String(a?.code || a?.name || '').localeCompare(String(b?.code || b?.name || ''), 'vi', { numeric: true });
  },

  // Thực hiện trách nhiệm riêng của khối _cinemasForMovie.
  _cinemasForMovie(movieId) {
    const cinemaIds = new Set(ShowtimeModel.getByMovie(movieId).map((showtime) => showtime.cinemaId));
    return CinemaModel.getAll()
      .filter((cinema) => cinemaIds.has(cinema.id))
      .sort((a, b) => this._compareCinema(a, b));
  },

  // Tạo dữ liệu mới trong khối _showAddForm và trả về kết quả đã chuẩn hóa.
  _showAddForm(options = {}) {
    const movies = MovieModel.getAll().filter(movie => ['nowShowing', 'comingSoon'].includes(movie.status));
    const cinemas = CinemaModel.getAll().sort((a, b) => this._compareCinema(a, b));
    const today = Helpers.getDateString(new Date());
    const selectedMovie = options.movie || (options.movieId
      ? movies.find(movie => movie.id === options.movieId)
      : null);
    const selectedCinema = options.cinema || (options.cinemaId
      ? cinemas.find(cinema => cinema.id === options.cinemaId)
      : null);
    const selectedRoom = options.room || (options.roomId
      ? RoomModel.getById(options.roomId)
      : null);
    const fixedRoom = Boolean(selectedCinema && selectedRoom);
    const useAvailableSlots = options.availableSlots === true;
    const releaseDate = selectedMovie?.releaseDate
      ? Helpers.getDateString(new Date(selectedMovie.releaseDate))
      : today;
    const firstScheduleDate = releaseDate > today ? releaseDate : today;
    const lastScheduleDate = selectedMovie?.endDate
      ? Helpers.getDateString(new Date(selectedMovie.endDate))
      : '';
    this._returnCinemaId = options.returnCinemaId || null;
    this._returnView = options.returnView || null;
    const content = `
      <form onsubmit="ShowtimeController.handleCreate(event)">
        <div class="admin-form-grid">
          ${selectedMovie ? `<div class="admin-showtime-selected-movie form-full">
            <img src="${Helpers.escapeHtml(selectedMovie.poster || API.moviePosterFallback)}" onerror="this.src=API.moviePosterFallback" alt="${Helpers.escapeHtml(selectedMovie.title)}" />
            <div><span>Phim đã chọn</span><strong>${Helpers.escapeHtml(selectedMovie.title)}</strong><small>${Helpers.formatDuration(selectedMovie.duration)} · ${selectedMovie.status === 'comingSoon' ? 'Sắp chiếu' : 'Đang chiếu'}</small></div>
          </div>` : ''}
          <div class="form-group form-full" ${selectedMovie ? 'style="display:none;"' : ''}>
            <label class="form-label">Phim</label>
            <select class="form-control" id="showtime-movie-id" required>
              <option value="">${movies.length ? 'Chọn phim' : 'Chưa có phim đang chiếu'}</option>
              ${movies.map((movie) => `<option value="${movie.id}" ${selectedMovie?.id === movie.id ? 'selected' : ''}>${Helpers.escapeHtml(movie.title)} (${movie.status === 'comingSoon' ? 'Sắp chiếu' : 'Đang chiếu'})</option>`).join('')}
            </select>
          </div>
          <div class="form-group" ${fixedRoom ? 'style="display:none;"' : ''}>
            <label class="form-label">Rạp / Chi nhánh</label>
            <select class="form-control" id="showtime-cinema-id" onchange="ShowtimeView._updateRoomOptions()" ${fixedRoom ? 'disabled' : ''} required>
              ${fixedRoom
                ? `<option value="${selectedCinema.id}" selected>${Helpers.escapeHtml(selectedCinema.name)}</option>`
                : `<option value="">Chọn rạp</option>${cinemas.map((cinema) => `<option value="${cinema.id}">${Helpers.escapeHtml(cinema.name)}</option>`).join('')}`}
            </select>
          </div>
          <div class="form-group" ${fixedRoom ? 'style="display:none;"' : ''}>
            <label class="form-label">Phòng</label>
            <select class="form-control" id="showtime-room-id" onchange="ShowtimeView._handleScheduleSelectionChange()" ${fixedRoom ? 'disabled' : ''} required>
              ${fixedRoom
                ? `<option value="${selectedRoom.id}" selected>${Helpers.escapeHtml(selectedRoom.name)} (${selectedRoom.capacity || selectedRoom.seatCount || 0} ghế)</option>`
                : '<option value="">Chọn phòng</option>'}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Ngày chiếu</label>
            <input class="form-control" id="showtime-date" type="date" min="${firstScheduleDate}" ${lastScheduleDate ? `max="${lastScheduleDate}"` : ''} value="${firstScheduleDate}" onchange="ShowtimeView._handleScheduleSelectionChange()" required />
          </div>
          <div class="form-group">
            <label class="form-label">${useAvailableSlots ? 'Giờ còn trống' : 'Giờ bắt đầu'}</label>
            ${useAvailableSlots
              ? '<select class="form-control" id="showtime-time" onchange="ShowtimeView._updateManualShowtimeHelper()" required><option value="">Chọn rạp và phòng trước</option></select>'
              : '<input class="form-control" id="showtime-time" type="time" step="60" onchange="ShowtimeView._updateManualShowtimeHelper()" required />'}
          </div>
          <input id="showtime-base-price" type="hidden" value="0" />
          <div class="form-group form-full" ${useAvailableSlots ? 'style="display:none;"' : ''}>
            <div class="alert alert-info" style="margin:0;">Hệ thống tự tính giờ kết thúc theo thời lượng phim, áp dụng bảng giá của rạp và tự tạo ghế cho suất chiếu.</div>
          </div>
          <div class="form-group form-full">
            <div id="showtime-slot-helper" class="alert alert-info" style="margin:0;">${useAvailableSlots ? 'Chọn rạp và phòng để hệ thống tải các giờ còn trống từ PostgreSQL.' : 'Có thể nhập bất kỳ giờ bắt đầu nào, kể cả 04:00. Khi lưu, hệ thống sẽ kiểm tra trùng lịch và 30 phút dọn phòng.'}</div>
          </div>
        </div>
        <div style="display:flex;gap:12px;justify-content:flex-end;margin-top:16px;">
          <button type="button" class="btn btn-secondary" onclick="Modal.close()">Hủy</button>
          <button type="submit" class="btn btn-primary"><i class="fas fa-check"></i> ${useAvailableSlots ? 'OK · Tạo Lịch Chiếu' : 'Tạo Lịch Chiếu'}</button>
        </div>
      </form>`;
    Modal.show(selectedMovie ? `Xếp Lịch · ${selectedMovie.title}` : (fixedRoom ? `Xếp Lịch · ${selectedRoom.name}` : 'Thêm Lịch Chiếu'), content, { size: 'lg' });
    const form = document.getElementById('showtime-movie-id')?.form;
    if (form) form.dataset.slotMode = useAvailableSlots ? 'available' : 'manual';
    document.getElementById('showtime-movie-id')?.addEventListener('change', () => this._handleScheduleSelectionChange());
    if (fixedRoom && useAvailableSlots) this._loadAvailableSlots();
  },

  // Cập nhật trạng thái hoặc dữ liệu trong khối _updateRoomOptions.
  _updateRoomOptions() {
    const cinemaId = document.getElementById('showtime-cinema-id')?.value;
    const roomSelect = document.getElementById('showtime-room-id');
    // Dừng hoặc đổi hướng luồng khi dữ liệu bắt buộc chưa sẵn sàng.
    if (!roomSelect) return;
    const rooms = cinemaId ? RoomModel.getByCinema(cinemaId) : [];
    roomSelect.innerHTML = `<option value="">Chọn phòng</option>${rooms.map((room) => `<option value="${room.id}">${Helpers.escapeHtml(room.name)} (${room.capacity || 0} ghế)</option>`).join('')}`;
    this._handleScheduleSelectionChange();
  },

  _handleScheduleSelectionChange() {
    const form = document.getElementById('showtime-movie-id')?.form;
    if (form?.dataset.slotMode === 'available') {
      this._loadAvailableSlots();
      return;
    }
    this._updateManualShowtimeHelper();
  },

  _updateManualShowtimeHelper() {
    const movieId = document.getElementById('showtime-movie-id')?.value;
    const date = document.getElementById('showtime-date')?.value;
    const time = document.getElementById('showtime-time')?.value;
    const helper = document.getElementById('showtime-slot-helper');
    if (!helper) return;
    const movie = MovieModel.getById(movieId);
    if (!movie || !date || !time) {
      helper.className = 'alert alert-info';
      helper.textContent = 'Có thể nhập bất kỳ giờ bắt đầu nào, kể cả 04:00. Khi lưu, hệ thống sẽ kiểm tra trùng lịch và 30 phút dọn phòng.';
      return;
    }
    const startAt = new Date(`${date}T${time}:00+07:00`);
    const endAt = new Date(startAt.getTime() + Number(movie.duration || 0) * 60000);
    helper.className = 'alert alert-info';
    helper.textContent = `Dự kiến kết thúc lúc ${endAt.toLocaleTimeString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit' })} ngày ${endAt.toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}. Backend sẽ kiểm tra trùng lịch trước khi tạo.`;
  },

  // Đọc và lọc dữ liệu cần thiết trong khối _loadAvailableSlots.
  async _loadAvailableSlots() {
    const movieId = document.getElementById('showtime-movie-id')?.value;
    const roomId = document.getElementById('showtime-room-id')?.value;
    const date = document.getElementById('showtime-date')?.value;
    const timeSelect = document.getElementById('showtime-time');
    const helper = document.getElementById('showtime-slot-helper');
    // Dừng hoặc đổi hướng luồng khi dữ liệu bắt buộc chưa sẵn sàng.
    if (!timeSelect || !helper) return;

    // Dừng hoặc đổi hướng luồng khi dữ liệu bắt buộc chưa sẵn sàng.
    if (!movieId || !roomId || !date) {
      timeSelect.innerHTML = '<option value="">Chọn phim, phòng và ngày trước</option>';
      helper.className = 'alert alert-info';
      helper.textContent = 'Chọn phim, rạp, phòng và ngày để xem giờ còn trống. Hệ thống tự chừa 30 phút dọn phòng sau mỗi suất.';
      return;
    }

    timeSelect.innerHTML = '<option value="">Đang tải giờ trống...</option>';
    helper.className = 'alert alert-info';
    helper.textContent = 'Đang kiểm tra lịch phòng và thời gian dọn phòng...';

    try {
      const result = await API.getAdminRoomAvailableSlots(roomId, movieId, date);
      const times = result.suggestedStartTimes || [];
      // Xử lý riêng trường hợp danh sách rỗng hoặc có số lượng không hợp lệ.
      if (!times.length) {
        timeSelect.innerHTML = '<option value="">Không còn giờ phù hợp</option>';
        helper.className = 'alert alert-warning';
        helper.textContent = 'Phòng này không còn khung giờ đủ dài cho phim đã chọn trong ngày này.';
        return;
      }

      timeSelect.innerHTML = '<option value="">Chọn giờ bắt đầu</option>' + times.map((time) => (
        `<option value="${Helpers.escapeHtml(time.value)}">${Helpers.escapeHtml(time.label)}</option>`
      )).join('');

      helper.className = 'alert alert-info';
      helper.innerHTML = `
        Có ${times.length} giờ bắt đầu hợp lệ.
        Đã tính thời lượng phim ${Number(result.movieDurationMin || 0)} phút và ${Number(result.cleanupMinutes || 0)} phút dọn phòng.
        ${this._slotSummary(result)}
      `;
    } catch (error) {
      timeSelect.innerHTML = '<option value="">Không thể tải giờ trống</option>';
      helper.className = 'alert alert-danger';
      helper.textContent = error.message || 'Không thể tải giờ trống của phòng này.';
    }
  },

  // Tính toán giá trị tổng hợp trong khối _slotSummary.
  _slotSummary(result) {
    const occupied = result.occupied || [];
    // Xử lý riêng trường hợp danh sách rỗng hoặc có số lượng không hợp lệ.
    if (!occupied.length) return 'Phòng chưa có suất chiếu trong ngày này.';
    return `Đã có ${occupied.length} suất chiếu, hệ thống chỉ hiện giờ không bị trùng và không vi phạm dọn phòng.`;
  },
};
