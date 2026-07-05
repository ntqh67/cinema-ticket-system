/* CineTicket - Booking View (Admin) */
const BookingView = {
  async renderAdmin() {
    if (!AuthController.requireAdmin()) return;
    document.body.classList.add('admin-layout');
    const main = document.getElementById('main-content');
    if (!main) return;

    main.innerHTML = this._layout(`
      <div class="admin-table-card">
        <div class="admin-table-empty">Dang tai danh sach dat ve tu database...</div>
      </div>
    `, '...');

    let bookings = [];
    try {
      bookings = await BookingModel.getAll();
    } catch (error) {
      main.innerHTML = this._layout(`
        <div class="admin-table-card">
          <div class="admin-table-empty">
            Khong ket noi duoc backend/database: ${Helpers.escapeHtml(error.message || 'Unknown error')}
          </div>
        </div>
      `, '0');
      return;
    }

    main.innerHTML = this._layout(this._table(bookings), bookings.length);
  },

  _layout(content, count) {
    return `
    <div class="admin-layout-wrap">
      ${UserView._renderAdminSidebar('bookings')}
      <div class="admin-main">
        ${UserView._renderAdminTopbar('Quan Ly Dat Ve', 'admin/bookings')}
        <div class="admin-content">
          <div class="admin-page-header">
            <div>
              <h1 class="admin-page-title">Dat Ve</h1>
              <p class="admin-page-subtitle">${count} don dat ve tu PostgreSQL</p>
            </div>
          </div>
          ${content}
        </div>
      </div>
    </div>`;
  },

  _table(bookings) {
    const rows = bookings.length === 0
      ? `<tr><td colspan="8" class="admin-table-empty">Chua co don dat ve nao trong database</td></tr>`
      : bookings.map((booking) => this._row(booking)).join('');

    return `
    <div class="admin-table-card">
      <div class="admin-table-header">
        <span class="admin-table-title">Danh Sach Dat Ve</span>
        <div class="admin-table-actions">
          <input type="text" class="form-control" placeholder="Tim kiem..." style="width:200px;" oninput="BookingView._filterTable(this.value)" />
        </div>
      </div>
      <div class="table-wrapper">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Ma DV</th>
              <th>Phim</th>
              <th>Nguoi Dat</th>
              <th>Ghe</th>
              <th>Tong Tien</th>
              <th>Trang Thai</th>
              <th>Ngay Dat</th>
              <th>Hanh Dong</th>
            </tr>
          </thead>
          <tbody id="bookings-admin-tbody">${rows}</tbody>
        </table>
      </div>
    </div>`;
  },

  _row(booking) {
    const statusMap = {
      paid: { label: 'Da thanh toan', cls: 'badge-success' },
      pending: { label: 'Cho thanh toan', cls: 'badge-warning' },
      cancelled: { label: 'Da huy', cls: 'badge-danger' },
      expired: { label: 'Het han', cls: 'badge-secondary' },
    };
    const status = statusMap[booking.status] || { label: booking.status || 'unknown', cls: 'badge-secondary' };
    const seats = (booking.seats || [])
      .map((seat) => typeof seat === 'object' ? seat.id : seat)
      .map((seat) => `<span class="badge badge-secondary" style="font-size:0.65rem;">${Helpers.escapeHtml(seat)}</span>`)
      .join('');
    const canCancel = booking.status === 'pending';

    return `<tr>
      <td><code style="font-size:0.75rem;">${booking.id.slice(0, 10).toUpperCase()}</code></td>
      <td style="font-size:0.8rem;font-weight:600;">${Helpers.escapeHtml(Helpers.truncate(booking.movieTitle || 'N/A', 25))}</td>
      <td style="font-size:0.8rem;">
        ${Helpers.escapeHtml(booking.userName || 'N/A')}<br>
        <span style="color:var(--color-text-muted);font-size:0.75rem;">${Helpers.escapeHtml(booking.userEmail || '')}</span>
      </td>
      <td><div style="display:flex;flex-wrap:wrap;gap:4px;">${seats}</div></td>
      <td style="color:var(--color-accent);font-weight:700;">${Helpers.formatCurrency(booking.totalAmount || 0)}</td>
      <td><span class="badge ${status.cls}">${status.label}</span></td>
      <td style="font-size:0.8rem;">${Helpers.formatDate(booking.createdAt)}</td>
      <td>
        <div class="table-actions">
          <button class="action-btn view" onclick="TicketView.renderBackendBooking('${booking.id}')" title="Xem ve"><i class="fas fa-eye"></i></button>
          ${canCancel ? `<button class="action-btn delete" onclick="BookingController.handleCancel('${booking.id}')" title="Huy"><i class="fas fa-times"></i></button>` : ''}
        </div>
      </td>
    </tr>`;
  },

  _filterTable(q) {
    const tbody = document.getElementById('bookings-admin-tbody');
    if (!tbody) return;
    tbody.querySelectorAll('tr').forEach((row) => {
      row.style.display = row.textContent.toLowerCase().includes(q.toLowerCase()) ? '' : 'none';
    });
  },
};
