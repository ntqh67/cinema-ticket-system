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
          <h2 class="section-title" style="margin-bottom:32px;">Tai Khoan Cua Toi</h2>
          <div class="card mb-6">
            <div class="card-header"><i class="fas fa-user"></i> Thong Tin Ca Nhan</div>
            <div class="card-body">
              <div style="display:flex;align-items:center;gap:24px;margin-bottom:32px;">
                <div style="width:80px;height:80px;border-radius:50%;background:var(--color-primary);display:flex;align-items:center;justify-content:center;font-size:2rem;font-weight:800;color:#fff;flex-shrink:0;">
                  ${user.avatar ? `<img src="${user.avatar}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">` : user.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style="font-size:1.25rem;font-weight:700;">${Helpers.escapeHtml(user.name)}</div>
                  <div style="color:var(--color-text-muted);font-size:0.875rem;">${Helpers.escapeHtml(user.email)}</div>
                  <span class="badge ${user.role === "admin" ? "badge-danger" : "badge-info"}" style="margin-top:8px;">${user.role === "admin" ? "Admin" : "Thanh Vien"}</span>
                </div>
              </div>
              <form onsubmit="UserController.handleUpdateProfile(event)">
                <div class="admin-form-grid">
                  <div class="form-group">
                    <label class="form-label">Ho va Ten</label>
                    <input type="text" class="form-control" id="profile-name" value="${Helpers.escapeHtml(user.name)}" />
                  </div>
                  <div class="form-group">
                    <label class="form-label">Email</label>
                    <input type="email" class="form-control" value="${Helpers.escapeHtml(user.email)}" disabled />
                  </div>
                  <div class="form-group">
                    <label class="form-label">So Dien Thoai</label>
                    <input type="tel" class="form-control" id="profile-phone" value="${Helpers.escapeHtml(user.phone || "")}" placeholder="0901234567" />
                  </div>
                  <div class="form-group">
                    <label class="form-label">Ngay Tham Gia</label>
                    <input type="text" class="form-control" value="${Helpers.formatDate(user.createdAt)}" disabled />
                  </div>
                </div>
                <button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> Luu Thay Doi</button>
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
            <div class="empty-state">Dang tai danh sach ve...</div>
          </div>
        </div>
      </div>
    </div>`;

    let tickets = [];
    try {
      tickets = await UserController.loadBookingHistory();
    } catch (error) {
      Toast.error(error.message || "Khong the tai ve");
    }

    const bookingGroups = this._groupTicketsByBooking(tickets);
    const rowsHtml =
      bookingGroups.length === 0
        ? `<tr><td colspan="7" style="text-align:center;padding:40px;color:var(--color-text-muted);">Ban chua co ve nao</td></tr>`
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
                  <th>Suat Chieu</th>
                  <th>Rap / Phong</th>
                  <th>Ghe</th>
                  <th>Trang Thai</th>
                  <th>Tong Tien</th>
                  <th>Hanh Dong</th>
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
            <div class="history-movie-cinema">${group.bookingId.slice(0, 10).toUpperCase()} · ${group.tickets.length} ve</div>
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
          <i class="fas fa-ticket-alt"></i> Xem Chi Tiet
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

  renderAdmin() {
    if (!AuthController.requireAdmin()) return;
    document.body.classList.add("admin-layout");
    const users = UserModel.getAll();
    const main = document.getElementById("main-content");
    if (!main) return;
    main.innerHTML = `
    <div class="admin-layout-wrap">
      ${this._renderAdminSidebar("users")}
      <div class="admin-main">
        ${this._renderAdminTopbar("Quan Ly Nguoi Dung", "admin/users")}
        <div class="admin-content">
          <div class="admin-page-header">
            <div>
              <h1 class="admin-page-title">Nguoi Dung</h1>
              <p class="admin-page-subtitle">${users.length} nguoi dung trong he thong</p>
            </div>
          </div>
        </div>
      </div>
    </div>`;
  },

  _renderAdminSidebar(active) {
    return `
    <aside class="admin-sidebar">
      <div class="admin-sidebar-header">
        <div class="admin-logo-icon"><i class="fas fa-film"></i></div>
        <span class="admin-logo-text">Cine<span>Ticket</span></span>
        <span class="admin-badge">Admin</span>
      </div>
      <nav class="admin-nav">
        <div class="admin-nav-section">
          <div class="admin-nav-section-title">Tong Quan</div>
          <a class="admin-nav-item ${active === "dashboard" ? "active" : ""}" onclick="Router.navigate('/admin')"><i class="fas fa-chart-line"></i> Dashboard</a>
          <a class="admin-nav-item ${active === "reports" ? "active" : ""}" onclick="Router.navigate('/admin/reports')"><i class="fas fa-chart-bar"></i> Bao Cao</a>
        </div>
        <div class="admin-nav-section">
          <div class="admin-nav-section-title">Quan Ly</div>
          <a class="admin-nav-item ${active === "movies" ? "active" : ""}" onclick="Router.navigate('/admin/movies')"><i class="fas fa-film"></i> Phim</a>
          <a class="admin-nav-item ${active === "cinemas" ? "active" : ""}" onclick="Router.navigate('/admin/cinemas')"><i class="fas fa-building"></i> Rap Chieu</a>
          <a class="admin-nav-item ${active === "rooms" ? "active" : ""}" onclick="Router.navigate('/admin/rooms')"><i class="fas fa-door-open"></i> Phong Chieu</a>
          <a class="admin-nav-item ${active === "showtimes" ? "active" : ""}" onclick="Router.navigate('/admin/showtimes')"><i class="fas fa-calendar-alt"></i> Lich Chieu</a>
          <a class="admin-nav-item ${active === "bookings" ? "active" : ""}" onclick="Router.navigate('/admin/bookings')"><i class="fas fa-ticket-alt"></i> Dat Ve</a>
          <a class="admin-nav-item ${active === "users" ? "active" : ""}" onclick="Router.navigate('/admin/users')"><i class="fas fa-users"></i> Nguoi Dung</a>
          <a class="admin-nav-item ${active === "promotions" ? "active" : ""}" onclick="Router.navigate('/admin/promotions')"><i class="fas fa-tags"></i> Khuyen Mai</a>
        </div>
      </nav>
      <div class="admin-sidebar-footer">
        <div class="admin-user-mini">
          <div class="admin-user-avatar">${(State.get("currentUser") || { name: "A" }).name.charAt(0)}</div>
          <div>
            <div class="admin-user-name">${Helpers.escapeHtml((State.get("currentUser") || { name: "Admin" }).name)}</div>
            <div class="admin-user-role">Quan Tri Vien</div>
          </div>
        </div>
        <button class="admin-logout-btn" onclick="AuthController.handleLogout()">
          <i class="fas fa-sign-out-alt"></i> Dang Xuat
        </button>
      </div>
    </aside>`;
  },

  _renderAdminTopbar(title) {
    return `
    <div class="admin-topbar">
      <div class="admin-breadcrumb">
        <span>Admin</span>
        <span class="breadcrumb-sep"><i class="fas fa-chevron-right" style="font-size:10px;"></i></span>
        <span class="breadcrumb-current">${title}</span>
      </div>
      <div class="admin-topbar-actions">
        <button class="home-link-btn" onclick="Router.navigate('/')"><i class="fas fa-home"></i> Trang Chu</button>
      </div>
    </div>`;
  },
};
