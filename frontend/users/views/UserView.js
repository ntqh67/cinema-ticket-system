/* CineTicket - User View */
const UserView = {
  renderProfile() {
    if (!AuthController.checkAuth()) return;
    const user = State.get("currentUser");
    const main = document.getElementById("main-content");
    if (!main) return;
    main.innerHTML = `
    <div class="page-wrapper">
      <div class="container">
        <div style="max-width:800px;margin:0 auto;">
          <h2 class="section-title" style="margin-bottom:32px;">Tài Khoản Của Tôi</h2>
          <div class="card mb-6">
            <div class="card-header"><i class="fas fa-user"></i> Thông Tin Cá Nhân</div>
            <div class="card-body">
              <div style="display:flex;align-items:center;gap:24px;margin-bottom:32px;">
                <div style="width:80px;height:80px;border-radius:50%;background:var(--color-primary);display:flex;align-items:center;justify-content:center;font-size:2rem;font-weight:800;color:#fff;flex-shrink:0;">
                  ${user.avatar ? `<img src="${user.avatar}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">` : user.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style="font-size:1.25rem;font-weight:700;">${Helpers.escapeHtml(user.name)}</div>
                  <div style="color:var(--color-text-muted);font-size:0.875rem;">${Helpers.escapeHtml(user.email)}</div>
                  <span class="badge ${user.role === "admin" ? "badge-danger" : "badge-info"}" style="margin-top:8px;">${user.role === "admin" ? "Admin" : "Thành Viên"}</span>
                </div>
              </div>
              <form onsubmit="UserController.handleUpdateProfile(event)">
                <div class="admin-form-grid">
                  <div class="form-group">
                    <label class="form-label">Họ Và Tên</label>
                    <input type="text" class="form-control" id="profile-name" value="${Helpers.escapeHtml(user.name)}" />
                  </div>
                  <div class="form-group">
                    <label class="form-label">Email</label>
                    <input type="email" class="form-control" value="${Helpers.escapeHtml(user.email)}" disabled />
                  </div>
                  <div class="form-group">
                    <label class="form-label">Số Điện Thoại</label>
                    <input type="tel" class="form-control" id="profile-phone" value="${Helpers.escapeHtml(user.phone || "")}" placeholder="0901234567" />
                  </div>
                  <div class="form-group">
                    <label class="form-label">Ngày Tham Gia</label>
                    <input type="text" class="form-control" value="${Helpers.formatDate(user.createdAt)}" disabled />
                  </div>
                </div>
                <button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> Lưu Thay Đổi</button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>`;
    document.getElementById("footer").style.display = "";
  },

  async renderHistory() {
    if (!AuthController.checkAuth()) return;
    const main = document.getElementById("main-content");
    if (!main) return;
    document.getElementById("footer").style.display = "";

    main.innerHTML = `
    <div class="page-wrapper">
      <div class="container">
        <h2 class="section-title">Vé Của Tôi</h2>
        <div class="card">
          <div class="card-body">
            <div class="empty-state">Đang tải danh sách vé...</div>
          </div>
        </div>
      </div>
    </div>`;

    let tickets = [];
    try {
      tickets = await UserController.loadBookingHistory();
    } catch (error) {
      Toast.error(error.message || "Không thể tải vé");
    }

    const bookingGroups = this._groupTicketsByBooking(tickets);
    const rowsHtml =
      bookingGroups.length === 0
        ? `<tr><td colspan="7" style="text-align:center;padding:40px;color:var(--color-text-muted);">Bạn chưa có vé nào</td></tr>`
        : bookingGroups.map((group) => this._bookingHistoryRow(group)).join("");

    main.innerHTML = `
    <div class="page-wrapper">
      <div class="container">
        <h2 class="section-title">Vé Của Tôi</h2>
        <div class="card">
          <div class="table-wrapper">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Phim</th>
                  <th>Suất Chiếu</th>
                  <th>Rạp / Phòng</th>
                  <th>Ghế</th>
                  <th>Trạng Thái</th>
                  <th>Tổng Tiền</th>
                  <th>Hành Động</th>
                </tr>
              </thead>
              <tbody>${rowsHtml}</tbody>
            </table>
          </div>
        </div>
      </div>
    </div>`;
  },

  _groupTicketsByBooking(tickets) {
    const groupsById = new Map();
    tickets.forEach((ticket) => {
      const bookingId = ticket.booking ? ticket.booking.id : ticket.id;
      if (!groupsById.has(bookingId)) {
        groupsById.set(bookingId, {
          bookingId,
          booking: ticket.booking || null,
          movie: ticket.movie || null,
          showtime: ticket.showtime || null,
          cinema: ticket.cinema || null,
          room: ticket.room || null,
          tickets: [],
        });
      }
      groupsById.get(bookingId).tickets.push(ticket);
    });

    return [...groupsById.values()]
      .map((group) => ({
        ...group,
        tickets: group.tickets.sort((a, b) => {
          const rowA = a.seat ? a.seat.row : "";
          const rowB = b.seat ? b.seat.row : "";
          if (rowA !== rowB) return rowA.localeCompare(rowB);
          return (a.seat ? a.seat.number : 0) - (b.seat ? b.seat.number : 0);
        }),
      }))
      .sort((a, b) => {
        const dateA = a.tickets[0] && a.tickets[0].issuedAt ? new Date(a.tickets[0].issuedAt).getTime() : 0;
        const dateB = b.tickets[0] && b.tickets[0].issuedAt ? new Date(b.tickets[0].issuedAt).getTime() : 0;
        return dateB - dateA;
      });
  },

  _bookingHistoryRow(group) {
    const seat = group.tickets
      .map((ticket) => ticket.seat ? `${ticket.seat.row}${ticket.seat.number}` : "")
      .filter(Boolean)
      .join(", ");
    const firstTicket = group.tickets[0] || {};
    const visual = this._movieVisual(group.movie);
    const movieTitle = group.movie ? group.movie.title : "N/A";
    const showtime = group.showtime
      ? `${Helpers.formatDate(group.showtime.startAt)} ${new Date(group.showtime.startAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}`
      : "";
    const roomText = `${group.cinema ? group.cinema.name : ""}<br><span style="color:var(--color-text-muted);font-size:0.8rem;">${group.room ? group.room.name : ""}</span>`;
    const totalAmount = group.booking ? group.booking.totalAmount : 0;
    const status = group.booking ? group.booking.status : firstTicket.status;
    return `<tr>
      <td>
        <div class="history-movie-cell">
          <img class="history-poster" src="${visual.poster}" alt="" onerror="this.src=API.moviePosterFallback">
          <div>
            <div class="history-movie-title">${Helpers.escapeHtml(movieTitle)}</div>
            <div class="history-movie-cinema">${group.bookingId.slice(0, 10).toUpperCase()} · ${group.tickets.length} vé</div>
          </div>
        </div>
      </td>
      <td>${showtime}</td>
      <td>${roomText}</td>
      <td><span class="badge badge-secondary">${seat}</span></td>
      <td><span class="badge badge-success">${status}</span></td>
      <td>${Helpers.formatCurrency(totalAmount)}</td>
      <td>
        <button class="btn btn-sm btn-outline" onclick="Router.navigate('/ticket/${group.bookingId}')">
          <i class="fas fa-ticket-alt"></i> Xem Chi Tiết
        </button>
      </td>
    </tr>`;
  },

  _movieVisual(movie) {
    const movieId = movie ? movie.id : "unknown";
    const localMovie = movie ? MovieModel.getById(movie.id) : null;
    return {
      poster: localMovie && localMovie.poster ? localMovie.poster : API.moviePosterFallback,
      banner: localMovie && localMovie.banner ? localMovie.banner : API.moviePosterFallback,
    };
  },

  async renderStaffAttendance() {
    const user = State.get('currentUser');
    if (!user || user.role !== 'staff') {
      Toast.error('Chỉ tài khoản nhân viên được truy cập trang chấm công');
      Router.navigate('/');
      return;
    }
    document.body.classList.remove('admin-layout');
    document.getElementById('footer').style.display = '';
    if (!this._myAttendanceCursor) this._myAttendanceCursor = new Date();
    const cursor = this._myAttendanceCursor;
    const month = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`;
    const main = document.getElementById('main-content');
    main.innerHTML = `<div class="staff-attendance-page"><div class="container"><div class="admin-table-card"><div class="admin-table-empty"><i class="fas fa-spinner fa-spin"></i> Đang tải lịch làm việc...</div></div></div></div>`;
    let data;
    try {
      data = await API.getMyStaffAttendance(month);
    } catch (error) {
      main.innerHTML = `<div class="staff-attendance-page"><div class="container"><div class="empty-state"><i class="fas fa-exclamation-circle"></i><h3>Không tải được chấm công</h3><p>${Helpers.escapeHtml(error.message || '')}</p></div></div></div>`;
      return;
    }
    this._myAttendanceData = data;
    const todayAttendance = data.todayAttendance;
    const activeAttendance = data.activeAttendance || todayAttendance;
    const activeShift = (data.shifts || []).find(shift => shift.code === activeAttendance?.shiftCode);
    const formatTime = value => value
      ? new Date(value).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' })
      : '—';
    main.innerHTML = `
      <div class="staff-attendance-page">
        <div class="container">
          <header class="staff-attendance-hero">
            <div><span class="admin-dashboard-eyebrow">Cổng nhân viên</span><h1>Chấm Công</h1><p>Xin chào ${Helpers.escapeHtml(user.name)} · Giờ hệ thống Đà Nẵng</p></div>
            <div class="staff-attendance-hero-actions"><div class="staff-month-salary"><small>Lương tháng ${cursor.getMonth() + 1}</small><strong>${Helpers.formatCurrency(data.monthSalary || 0)}</strong></div><button class="btn btn-outline" onclick="Router.navigate('/')"><i class="fas fa-home"></i> Trang Chủ</button></div>
          </header>
          <section class="staff-today-shift">
            <div class="staff-today-date"><i class="fas fa-calendar-day"></i><div><small>Hôm nay</small><strong>${new Date(`${data.today}T00:00:00`).toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })}</strong></div></div>
            <div class="staff-shift-time"><small>Vào ca</small><strong>${formatTime(todayAttendance?.checkInAt)}</strong></div>
            <div class="staff-shift-time"><small>Ra ca</small><strong>${formatTime(activeAttendance?.checkOutAt)}</strong></div>
            <div class="staff-shift-picker"><small>Ca làm việc</small>${activeShift ? `<strong>${activeShift.name}</strong><span>${activeShift.start} – ${activeShift.end}</span>` : `<select id="staff-shift-select" class="form-control">${(data.shifts || []).map(shift => `<option value="${shift.code}">${shift.name} · ${shift.start} – ${shift.end}</option>`).join('')}</select>`}</div>
            <div class="staff-shift-actions">
              <button class="btn btn-primary" ${activeAttendance?.checkInAt ? 'disabled' : ''} onclick="UserView.staffCheckIn()"><i class="fas fa-sign-in-alt"></i> Vào Ca</button>
              <button class="btn btn-outline" ${!activeAttendance?.checkInAt || activeAttendance?.checkOutAt ? 'disabled' : ''} onclick="UserView.staffCheckOut()"><i class="fas fa-sign-out-alt"></i> Ra Ca</button>
            </div>
          </section>
          <div id="my-staff-month-calendar"></div>
        </div>
      </div>`;
    this._renderMyStaffCalendar();
  },

  async staffCheckIn() {
    const shiftCode = document.getElementById('staff-shift-select')?.value;
    if (!shiftCode) {
      Toast.error('Vui lòng chọn ca làm việc');
      return;
    }
    const shift = (this._myAttendanceData?.shifts || []).find(item => item.code === shiftCode);
    const confirmed = await Modal.confirm(`Xác nhận vào ${shift?.name || shiftCode} (${shift?.start} – ${shift?.end})?`, 'Vào Ca', 'info');
    if (!confirmed) return;
    try {
      await API.staffCheckIn(shiftCode);
      Toast.success('Đã ghi nhận giờ vào ca');
      await this.renderStaffAttendance();
    } catch (error) {
      Toast.error(error.message || 'Không thể vào ca');
    }
  },

  async staffCheckOut() {
    const confirmed = await Modal.confirm('Xác nhận kết thúc ca làm việc bây giờ?', 'Ra Ca', 'warning');
    if (!confirmed) return;
    try {
      await API.staffCheckOut();
      Toast.success('Đã ghi nhận giờ ra ca');
      await this.renderStaffAttendance();
    } catch (error) {
      Toast.error(error.message || 'Không thể ra ca');
    }
  },

  changeMyAttendanceMonth(offset) {
    const cursor = this._myAttendanceCursor || new Date();
    this._myAttendanceCursor = new Date(cursor.getFullYear(), cursor.getMonth() + offset, 1);
    this.renderStaffAttendance();
  },

  _renderMyStaffCalendar() {
    const container = document.getElementById('my-staff-month-calendar');
    const data = this._myAttendanceData;
    if (!container || !data) return;
    const cursor = this._myAttendanceCursor;
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const leading = (new Date(year, month, 1).getDay() + 6) % 7;
    const records = new Map((data.attendances || []).map(item => [item.workDate, item]));
    const statusMeta = { PRESENT: ['Đúng giờ', 'present'], LATE: ['Đi muộn', 'late'], ABSENT: ['Vắng mặt', 'absent'], LEAVE: ['Nghỉ phép', 'leave'] };
    const formatTime = value => value ? new Date(value).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' }) : '';
    const cells = Array.from({ length: leading }, () => '<div class="staff-calendar-day is-empty"></div>');
    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const item = records.get(date);
      const meta = item ? statusMeta[item.status] : null;
      const times = item ? [formatTime(item.checkInAt), formatTime(item.checkOutAt)].filter(Boolean).join(' – ') : '';
      const shift = item ? (data.shifts || []).find(entry => entry.code === item.shiftCode) : null;
      cells.push(`<div class="staff-calendar-day ${meta ? `has-attendance status-${meta[1]}` : ''} ${date === data.today ? 'is-today' : ''}"><span class="staff-calendar-date">${day}</span>${meta ? `<strong>${meta[0]}</strong>${shift ? `<small>${shift.name} · ${shift.start}–${shift.end}</small>` : ''}<small>${times || 'Chưa đủ giờ vào/ra'}</small>${item.pay?.salary ? `<small class="staff-day-salary">${Helpers.formatCurrency(item.pay.salary)}</small>` : ''}` : '<small>—</small>'}</div>`);
    }
    while (cells.length % 7) cells.push('<div class="staff-calendar-day is-empty"></div>');
    container.innerHTML = `<section class="staff-month-calendar"><div class="staff-calendar-toolbar"><button class="staff-calendar-nav" onclick="UserView.changeMyAttendanceMonth(-1)"><i class="fas fa-chevron-left"></i></button><h4>Tháng ${month + 1} năm ${year}</h4><button class="staff-calendar-nav" onclick="UserView.changeMyAttendanceMonth(1)"><i class="fas fa-chevron-right"></i></button></div><div class="staff-calendar-weekdays">${['T2','T3','T4','T5','T6','T7','CN'].map(day => `<span>${day}</span>`).join('')}</div><div class="staff-calendar-grid">${cells.join('')}</div><div class="staff-calendar-legend"><span class="present">Đúng giờ</span><span class="late">Đi muộn</span><span class="absent">Vắng mặt</span><span class="leave">Nghỉ phép</span></div></section>`;
  },

  async renderAdmin() {
    return this._renderAdminDirectory();
  },

  async renderAdminStaff() {
    return this._renderAdminDirectory('STAFF');
  },

  async _renderAdminDirectory(role) {
    if (!AuthController.requireAdmin()) return;
    document.body.classList.add("admin-layout");
    const main = document.getElementById("main-content");
    if (!main) return;
    const isStaff = role === 'STAFF';
    const active = isStaff ? 'staff' : 'users';
    const title = isStaff ? 'Nhân Viên' : 'Người Dùng';
    main.innerHTML = `
      <div class="admin-layout-wrap">
        ${this._renderAdminSidebar(active)}
        <div class="admin-main"><div class="admin-content"><div class="admin-table-card"><div class="admin-table-empty">Đang tải ${title.toLowerCase()} từ PostgreSQL...</div></div></div></div>
      </div>`;

    let users = [];
    try {
      users = await API.getAdminUsers(role);
    } catch (error) {
      main.querySelector('.admin-content').innerHTML = `<div class="admin-table-card"><div class="admin-table-empty">Không tải được ${title.toLowerCase()}: ${Helpers.escapeHtml(error.message || 'Backend unavailable')}</div></div>`;
      return;
    }
    this._adminDirectoryUsers = users;

    main.innerHTML = `
    <div class="admin-layout-wrap">
      ${this._renderAdminSidebar(active)}
      <div class="admin-main">
        <div class="admin-content">
          <div class="admin-page-header">
            <div>
              <h1 class="admin-page-title">${title}</h1>
              <p class="admin-page-subtitle">${users.length} ${isStaff ? 'nhân viên' : 'tài khoản có thể đặt vé'} trong hệ thống</p>
            </div>
            ${isStaff ? `<button class="btn btn-primary" onclick="UserView.showCreateStaffForm()"><i class="fas fa-user-plus"></i> Thêm Nhân Viên</button>` : ''}
          </div>
          <div class="admin-table-card">
            <div class="table-wrapper">
              <table class="admin-table">
                <thead><tr><th>Họ tên</th><th>Email</th><th>Số điện thoại</th><th>Vai trò</th><th>Đặt vé</th><th>Ngày tham gia</th>${isStaff ? '<th>Thao tác</th>' : ''}</tr></thead>
                <tbody>
                  ${users.map(user => {
                    const roleMeta = {
                      CUSTOMER: ['Khách hàng', 'badge-info'],
                      STAFF: ['Nhân viên', 'badge-warning'],
                      ADMIN: ['Admin', 'badge-danger'],
                    }[user.role] || [user.role || 'Không rõ', 'badge-secondary'];
                    const detailAction = isStaff ? 'showAdminStaffDetail' : 'showAdminUserDetail';
                    return `<tr class="admin-user-directory-row" role="button" tabindex="0" onclick="UserView.${detailAction}('${user.id}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();UserView.${detailAction}('${user.id}');}">
                    <td><strong>${Helpers.escapeHtml(user.name || '')}</strong>${user.username ? `<small style="display:block;color:var(--color-text-dim);margin-top:3px;">@${Helpers.escapeHtml(user.username)}</small>` : ''}</td>
                    <td>${Helpers.escapeHtml(user.email || '')}</td>
                    <td>${Helpers.escapeHtml(user.phone || 'Chưa cập nhật')}</td>
                    <td><span class="badge ${roleMeta[1]}">${roleMeta[0]}</span></td>
                    <td>${Number(user.bookingCount || 0).toLocaleString('vi-VN')}</td>
                    <td>${new Date(user.createdAt).toLocaleDateString('vi-VN')}</td>
                    ${isStaff ? `<td><button class="btn btn-outline btn-sm" onclick="event.stopPropagation();UserView.removeAdminStaff('${user.id}')" title="Thu hồi quyền nhân viên"><i class="fas fa-user-minus"></i> Xóa</button></td>` : ''}
                  </tr>`;
                  }).join('') || `<tr><td colspan="${isStaff ? 7 : 6}" class="admin-table-empty">Chưa có ${title.toLowerCase()}</td></tr>`}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>`;
  },

  showCreateStaffForm() {
    Modal.show('Thêm Nhân Viên', `
      <form id="admin-create-staff-form" onsubmit="UserView.createAdminStaff(event)">
        <div class="form-group"><label class="form-label">Họ và tên *</label><input class="form-control" name="name" minlength="2" required></div>
        <div class="form-group"><label class="form-label">Email *</label><input class="form-control" name="email" type="email" required><small class="form-text">Nếu email đã là khách hàng, tài khoản sẽ được chuyển thành nhân viên, giữ nguyên mật khẩu và lịch sử đặt vé.</small></div>
        <div class="form-group"><label class="form-label">Số điện thoại</label><input class="form-control" name="phone" type="tel"></div>
        <div class="form-group"><label class="form-label">Mật khẩu *</label><input class="form-control" name="password" type="password" minlength="6" required></div>
        <div style="display:flex;justify-content:flex-end;gap:12px;margin-top:24px;">
          <button type="button" class="btn btn-secondary" onclick="Modal.close()">Hủy</button>
          <button type="submit" class="btn btn-primary"><i class="fas fa-user-plus"></i> Thêm Nhân Viên</button>
        </div>
      </form>`, { size: 'md', hideFooter: true });
  },

  async createAdminStaff(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const submit = form.querySelector('button[type="submit"]');
    submit.disabled = true;
    try {
      await API.createAdminStaff({
        name: form.name.value.trim(),
        email: form.email.value.trim(),
        phone: form.phone.value.trim(),
        password: form.password.value,
      });
      Modal.close();
      Toast.success('Đã thêm nhân viên và lưu vào PostgreSQL');
      await this.renderAdminStaff();
    } catch (error) {
      Toast.error(error.message || 'Không thể thêm nhân viên');
      submit.disabled = false;
    }
  },

  async removeAdminStaff(staffId) {
    const staff = (this._adminDirectoryUsers || []).find(item => item.id === staffId);
    const confirmed = await Modal.confirm(
      `Thu hồi quyền nhân viên của ${staff?.name || 'tài khoản này'}? Tài khoản và lịch sử đặt vé vẫn được giữ lại dưới vai trò khách hàng.`,
      'Xóa Nhân Viên',
      'danger',
    );
    if (!confirmed) return;
    try {
      await API.removeAdminStaff(staffId);
      Toast.success('Đã thu hồi quyền nhân viên');
      await this.renderAdminStaff();
    } catch (error) {
      Toast.error(error.message || 'Không thể xóa nhân viên');
    }
  },

  async showAdminStaffDetail(staffId) {
    Modal.show('Thông Tin Nhân Viên', `
      <div id="admin-staff-detail-content" class="admin-table-empty"><i class="fas fa-spinner fa-spin"></i> Đang tải hồ sơ và lịch chấm công từ PostgreSQL...</div>`,
      { size: 'xl', className: 'admin-user-detail-modal' });
    let staff;
    try {
      staff = await API.getAdminStaffDetail(staffId);
    } catch (error) {
      const content = document.getElementById('admin-staff-detail-content');
      if (content) content.innerHTML = `<span style="color:var(--color-danger);">${Helpers.escapeHtml(error.message || 'Không thể tải thông tin nhân viên')}</span>`;
      return;
    }

    this._activeStaffDetail = staff;
    this._staffCalendarCursor = new Date();
    const content = document.getElementById('admin-staff-detail-content');
    if (!content) return;
    content.className = 'admin-user-detail';
    content.innerHTML = `
      <section class="admin-user-detail-profile">
        <div class="admin-user-detail-avatar">${Helpers.escapeHtml((staff.name || staff.email || 'N').charAt(0).toUpperCase())}</div>
        <div class="admin-user-detail-identity">
          <span>Hồ sơ nhân viên</span><h3>${Helpers.escapeHtml(staff.name || '')}</h3>
          <p><i class="fas fa-envelope"></i> ${Helpers.escapeHtml(staff.email || '')}</p>
          <p><i class="fas fa-phone"></i> ${Helpers.escapeHtml(staff.phone || 'Chưa cập nhật')}</p>
        </div>
        <div class="admin-user-detail-account"><small>Nhân viên từ ${new Date(staff.createdAt).toLocaleDateString('vi-VN')}</small></div>
      </section>
      <section class="admin-user-detail-kpis">
        <div><small>Đúng giờ</small><strong>${staff.attendanceSummary?.PRESENT || 0}</strong></div>
        <div><small>Đi muộn</small><strong>${staff.attendanceSummary?.LATE || 0}</strong></div>
        <div><small>Vắng / nghỉ phép</small><strong>${(staff.attendanceSummary?.ABSENT || 0) + (staff.attendanceSummary?.LEAVE || 0)}</strong></div>
        <div><small>Lượt đặt vé cá nhân</small><strong>${staff.bookingCount || 0}</strong></div>
      </section>
      <div class="admin-user-detail-history-heading">
        <div><span class="admin-dashboard-eyebrow">Nhân sự</span><h3>Lịch làm việc theo tháng</h3></div>
      </div>
      <div id="admin-staff-month-calendar"></div>`;
    this._renderStaffMonthCalendar();
  },

  _changeStaffCalendarMonth(offset) {
    const cursor = this._staffCalendarCursor || new Date();
    this._staffCalendarCursor = new Date(cursor.getFullYear(), cursor.getMonth() + offset, 1);
    this._renderStaffMonthCalendar();
  },

  _renderStaffMonthCalendar() {
    const container = document.getElementById('admin-staff-month-calendar');
    const staff = this._activeStaffDetail;
    if (!container || !staff) return;
    const cursor = this._staffCalendarCursor || new Date();
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const leadingEmptyDays = (new Date(year, month, 1).getDay() + 6) % 7;
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());
    const records = new Map((staff.attendances || []).map(item => [item.workDate, item]));
    const statusMeta = {
      PRESENT: ['Đúng giờ', 'present'],
      LATE: ['Đi muộn', 'late'],
      ABSENT: ['Vắng mặt', 'absent'],
      LEAVE: ['Nghỉ phép', 'leave'],
    };
    const shiftMeta = {
      A: 'Ca A · 08:00–16:00',
      B: 'Ca B · 16:00–23:00',
      C: 'Ca C · 18:00–03:00',
    };
    const formatTime = value => value
      ? new Date(value).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' })
      : '';
    const monthSalary = Array.from(records.values()).reduce((sum, item) => sum + Number(item.pay?.salary || 0), 0);
    const cells = Array.from({ length: leadingEmptyDays }, () => '<div class="staff-calendar-day is-empty"></div>');
    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const attendance = records.get(date);
      const meta = attendance ? statusMeta[attendance.status] : null;
      const timeRange = attendance
        ? [formatTime(attendance.checkInAt), formatTime(attendance.checkOutAt)].filter(Boolean).join(' – ')
        : '';
      const detail = attendance
        ? `${meta?.[0] || attendance.status}${attendance.shiftCode ? ` · ${shiftMeta[attendance.shiftCode] || attendance.shiftCode}` : ''}${timeRange ? ` · ${timeRange}` : ''}${attendance.note ? ` · ${attendance.note}` : ''}`
        : 'Không có dữ liệu';
      cells.push(`<div class="staff-calendar-day ${meta ? `has-attendance status-${meta[1]}` : ''} ${date === today ? 'is-today' : ''}" title="${Helpers.escapeHtml(detail)}">
        <span class="staff-calendar-date">${day}</span>
        ${meta ? `<strong>${meta[0]}</strong>${attendance.shiftCode ? `<small>${shiftMeta[attendance.shiftCode] || attendance.shiftCode}</small>` : ''}${timeRange ? `<small>${timeRange}</small>` : ''}${attendance.pay?.salary ? `<small class="staff-day-salary">${Helpers.formatCurrency(attendance.pay.salary)}</small>` : ''}${attendance.note ? `<small class="staff-calendar-note">${Helpers.escapeHtml(attendance.note)}</small>` : ''}` : '<small>—</small>'}
      </div>`);
    }
    while (cells.length % 7) cells.push('<div class="staff-calendar-day is-empty"></div>');
    container.innerHTML = `
      <section class="staff-month-calendar">
        <div class="staff-calendar-toolbar">
          <button class="staff-calendar-nav" onclick="UserView._changeStaffCalendarMonth(-1)" title="Tháng trước"><i class="fas fa-chevron-left"></i></button>
          <h4>Tháng ${month + 1} năm ${year}<small class="staff-calendar-month-total">Tổng lương: ${Helpers.formatCurrency(monthSalary)}</small></h4>
          <button class="staff-calendar-nav" onclick="UserView._changeStaffCalendarMonth(1)" title="Tháng sau"><i class="fas fa-chevron-right"></i></button>
        </div>
        <div class="staff-calendar-weekdays">${['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map(day => `<span>${day}</span>`).join('')}</div>
        <div class="staff-calendar-grid">${cells.join('')}</div>
        <div class="staff-calendar-legend"><span class="present">Đúng giờ</span><span class="late">Đi muộn</span><span class="absent">Vắng mặt</span><span class="leave">Nghỉ phép</span><small>Di chuột vào ngày để xem đầy đủ thông tin.</small></div>
      </section>`;
  },

  async showAdminUserDetail(userId) {
    const user = (this._adminDirectoryUsers || []).find(item => item.id === userId);
    if (!user) return;
    Modal.show('Thông Tin Người Dùng', `
      <div id="admin-user-detail-content" class="admin-table-empty">
        <i class="fas fa-spinner fa-spin"></i> Đang tải lịch sử đặt vé từ PostgreSQL...
      </div>`, { size: 'xl', className: 'admin-user-detail-modal' });

    let result;
    try {
      result = await API.getUserBookings(userId);
    } catch (error) {
      const content = document.getElementById('admin-user-detail-content');
      if (content) content.innerHTML = `<span style="color:var(--color-danger);">${Helpers.escapeHtml(error.message || 'Không thể tải lịch sử đặt vé')}</span>`;
      return;
    }

    const bookings = result.bookings || [];
    const paidBookings = bookings.filter(booking => booking.status === 'PAID');
    const paidTotal = paidBookings.reduce((sum, booking) => sum + Number(booking.totalAmount || 0), 0);
    const bookingStatus = {
      PAID: ['Đã thanh toán', 'badge-success'],
      PENDING: ['Chờ thanh toán', 'badge-warning'],
      CANCELLED: ['Đã hủy', 'badge-danger'],
      EXPIRED: ['Hết hạn', 'badge-secondary'],
      REFUNDED: ['Đã hoàn tiền', 'badge-secondary'],
    };
    const paymentStatus = {
      SUCCESS: ['Thành công', 'badge-success'],
      PENDING: ['Đang chờ', 'badge-warning'],
      FAILED: ['Thất bại', 'badge-danger'],
      CANCELLED: ['Đã hủy', 'badge-secondary'],
      REFUNDED: ['Đã hoàn tiền', 'badge-secondary'],
    };
    const content = document.getElementById('admin-user-detail-content');
    if (!content) return;
    content.className = 'admin-user-detail';
    content.innerHTML = `
      <section class="admin-user-detail-profile">
        <div class="admin-user-detail-avatar">${Helpers.escapeHtml((user.name || user.email || 'U').charAt(0).toUpperCase())}</div>
        <div class="admin-user-detail-identity">
          <span>Hồ sơ tài khoản đặt vé</span>
          <h3>${Helpers.escapeHtml(user.name || '')}</h3>
          <p><i class="fas fa-envelope"></i> ${Helpers.escapeHtml(user.email || '')}</p>
          <p><i class="fas fa-phone"></i> ${Helpers.escapeHtml(user.phone || 'Chưa cập nhật')}</p>
        </div>
        <div class="admin-user-detail-account">
          <small>Tham gia ${new Date(user.createdAt).toLocaleDateString('vi-VN')}</small>
        </div>
      </section>
      <section class="admin-user-detail-kpis">
        <div><small>Tổng đặt vé</small><strong>${bookings.length}</strong></div>
        <div><small>Đã thanh toán</small><strong>${paidBookings.length}</strong></div>
        <div><small>Tổng tiền đã trả</small><strong>${Helpers.formatCurrency(paidTotal)}</strong></div>
      </section>
      <div class="admin-user-detail-history-heading">
        <div><span class="admin-dashboard-eyebrow">Kiểm tra sự cố</span><h3>Lịch sử đặt vé</h3></div>
        <span>${bookings.length} hóa đơn</span>
      </div>
      <div class="table-wrapper">
        <table class="admin-table admin-user-booking-history">
          <thead><tr><th>Mã đặt vé</th><th>Phim / Suất chiếu</th><th>Rạp / Phòng</th><th>Ghế</th><th>Đặt vé</th><th>Thanh toán</th><th>Tổng tiền</th><th></th></tr></thead>
          <tbody>
            ${bookings.map(booking => {
              const bookingMeta = bookingStatus[booking.status] || [booking.status || 'Không rõ', 'badge-secondary'];
              const paymentMeta = booking.payment ? (paymentStatus[booking.payment.status] || [booking.payment.status, 'badge-secondary']) : ['Chưa thanh toán', 'badge-secondary'];
              const seats = (booking.seats || []).map(seat => `${seat.row}${seat.number}`).join(', ');
              return `<tr>
                <td><code title="${Helpers.escapeHtml(booking.id)}">${Helpers.escapeHtml(String(booking.id).slice(-8))}</code><small>${new Date(booking.createdAt).toLocaleString('vi-VN')}</small></td>
                <td><strong>${Helpers.escapeHtml(booking.movie?.title || '')}</strong><small>${Helpers.formatDateTime(booking.showtime?.startAt)}</small></td>
                <td>${Helpers.escapeHtml(booking.cinema?.name || '')}<small>${Helpers.escapeHtml(booking.room?.name || '')}</small></td>
                <td>${Helpers.escapeHtml(seats || 'Không có')}</td>
                <td><span class="badge ${bookingMeta[1]}">${bookingMeta[0]}</span></td>
                <td><span class="badge ${paymentMeta[1]}">${paymentMeta[0]}</span>${booking.payment?.provider ? `<small>${Helpers.escapeHtml(booking.payment.provider)}</small>` : ''}</td>
                <td><strong>${Helpers.formatCurrency(booking.totalAmount || 0)}</strong></td>
                <td><button class="btn btn-outline btn-sm" onclick="BookingView.showDetail('${booking.id}')"><i class="fas fa-eye"></i> Chi tiết</button></td>
              </tr>`;
            }).join('') || '<tr><td colspan="8" class="admin-table-empty">Người dùng chưa có lịch sử đặt vé</td></tr>'}
          </tbody>
        </table>
      </div>`;
  },

  _renderAdminSidebar(active) {
    return `
    <aside class="admin-sidebar">
      <div class="admin-sidebar-header" role="button" tabindex="0" title="Về trang chủ" onclick="Router.navigate('/')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();Router.navigate('/');}">
        <div class="admin-logo-icon"><i class="fas fa-film"></i></div>
        <span class="admin-logo-text">CR<span>Ticket</span></span>
        <span class="admin-badge">Admin</span>
      </div>
      <nav class="admin-nav">
        <div class="admin-nav-section">
          <div class="admin-nav-section-title">Tổng Quan</div>
          <a class="admin-nav-item ${active === "dashboard" ? "active" : ""}" onclick="Router.navigate('/admin')"><i class="fas fa-chart-pie"></i> Dashboard</a>
        </div>
        <div class="admin-nav-section">
          <div class="admin-nav-section-title">Quản Lý</div>
          <a class="admin-nav-item ${active === "movies" ? "active" : ""}" onclick="Router.navigate('/admin/movies')"><i class="fas fa-film"></i> Phim</a>
          <a class="admin-nav-item ${active === "cinemas" ? "active" : ""}" onclick="Router.navigate('/admin/cinemas')"><i class="fas fa-building"></i> Rạp Chiếu</a>
          <a class="admin-nav-item ${active === "revenue" ? "active" : ""}" onclick="Router.navigate('/admin/revenue')"><i class="fas fa-chart-line"></i> Doanh Thu</a>
          <a class="admin-nav-item ${active === "concessions" ? "active" : ""}" onclick="Router.navigate('/admin/concessions')"><i class="fas fa-shopping-basket"></i> Combo</a>
          <a class="admin-nav-item ${active === "users" ? "active" : ""}" onclick="Router.navigate('/admin/users')"><i class="fas fa-users"></i> Người Dùng</a>
          <a class="admin-nav-item ${active === "staff" ? "active" : ""}" onclick="Router.navigate('/admin/staff')"><i class="fas fa-user-tie"></i> Nhân Viên</a>
        </div>
      </nav>
      <div class="admin-sidebar-footer">
        <div class="admin-user-mini">
          <div class="admin-user-avatar">${(State.get("currentUser") || { name: "A" }).name.charAt(0)}</div>
          <div>
            <div class="admin-user-name">${Helpers.escapeHtml((State.get("currentUser") || { name: "Admin" }).name)}</div>
            <div class="admin-user-role">Quản Trị Viên</div>
          </div>
        </div>
        <button class="admin-logout-btn" onclick="AuthController.handleLogout()">
          <i class="fas fa-sign-out-alt"></i> Đăng Xuất
        </button>
      </div>
    </aside>`;
  },

  _renderAdminTopbar(title) {
    return '';
  },
};
