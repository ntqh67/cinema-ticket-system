/* CineTicket - Booking View (Admin) */
const BookingView = {
  async renderAdmin() {
    if (!AuthController.requireAdmin()) return;
    document.body.classList.add('admin-layout');
    const main = document.getElementById('main-content');
    if (!main) return;

    main.innerHTML = this._layout(`
      <div class="admin-table-card">
        <div class="admin-table-empty">Đang tải danh sách đặt vé từ database...</div>
      </div>
    `, '...');

    let bookings = [];
    try {
      bookings = await BookingModel.getAll();
    } catch (error) {
      main.innerHTML = this._layout(`
        <div class="admin-table-card">
          <div class="admin-table-empty">
            Không kết nối được backend/database: ${Helpers.escapeHtml(error.message || 'Unknown error')}
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
        ${UserView._renderAdminTopbar('Quản Lý Đặt Vé', 'admin/bookings')}
        <div class="admin-content">
          <div class="admin-page-header">
            <div>
              <h1 class="admin-page-title">Đặt Vé</h1>
              <p class="admin-page-subtitle">${count} đơn đặt vé từ PostgreSQL</p>
            </div>
          </div>
          ${content}
        </div>
      </div>
    </div>`;
  },

  _table(bookings) {
    const rows = bookings.length === 0
      ? `<tr><td colspan="8" class="admin-table-empty">Chưa có đơn đặt vé nào trong database</td></tr>`
      : bookings.map((booking) => this._row(booking)).join('');

    return `
    <div class="admin-table-card">
      <div class="admin-table-header">
        <span class="admin-table-title">Danh Sách Đặt Vé</span>
        <div class="admin-table-actions">
          <input type="text" class="form-control" placeholder="Tìm kiếm..." style="width:200px;" oninput="BookingView._filterTable(this.value)" />
        </div>
      </div>
      <div class="table-wrapper">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Mã ĐV</th>
              <th>Phim</th>
              <th>Người Đặt</th>
              <th>Ghế</th>
              <th>Tổng Tiền</th>
              <th>Trạng Thái</th>
              <th>Ngày Đặt</th>
              <th>Hành Động</th>
            </tr>
          </thead>
          <tbody id="bookings-admin-tbody">${rows}</tbody>
        </table>
      </div>
    </div>`;
  },

  _row(booking) {
    const status = this._status(booking.status);
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
          <button class="action-btn view" onclick="BookingView.showDetail('${booking.id}')" title="Xem chi tiết"><i class="fas fa-eye"></i></button>
          ${canCancel ? `<button class="action-btn delete" onclick="BookingController.handleCancel('${booking.id}')" title="Hủy"><i class="fas fa-times"></i></button>` : ''}
        </div>
      </td>
    </tr>`;
  },

  async showDetail(bookingId) {
    try {
      const booking = await BookingModel.getDetail(bookingId);
      Modal.show('Chi Tiết Đặt Vé', this._detailHtml(booking), { size: 'lg' });
    } catch (error) {
      Toast.error(error.message || 'Không thể tải chi tiết đặt vé');
    }
  },

  _detailHtml(booking) {
    const status = this._status(String(booking.status || '').toLowerCase());
    const seatRows = (booking.seats || []).map((seat) => `
      <tr>
        <td>${Helpers.escapeHtml(seat.id || `${seat.row}${seat.number}`)}</td>
        <td>${Helpers.escapeHtml(seat.type || '')}</td>
        <td>${Helpers.formatCurrency(seat.unitPrice || 0)}</td>
      </tr>`).join('');
    const comboRows = (booking.comboItems || []).map((item) => `
      <tr>
        <td>${Helpers.escapeHtml(item.name || '')}</td>
        <td>${item.quantity}</td>
        <td>${Helpers.formatCurrency(item.unitPrice || 0)}</td>
        <td>${Helpers.formatCurrency(item.lineTotal || 0)}</td>
      </tr>`).join('');
    const paymentRows = (booking.payments || []).map((payment) => `
      <tr>
        <td>${Helpers.escapeHtml(payment.provider || '')}</td>
        <td>${Helpers.escapeHtml(payment.status || '')}</td>
        <td>${Helpers.formatCurrency(payment.amount || 0)}</td>
        <td>${payment.paidAt ? Helpers.formatDateTime(payment.paidAt) : '-'}</td>
      </tr>`).join('');
    const ticketRows = (booking.tickets || []).map((ticket) => `
      <tr>
        <td>${Helpers.escapeHtml(ticket.seat ? ticket.seat.id : '')}</td>
        <td>${Helpers.escapeHtml(ticket.status || '')}</td>
        <td><code style="font-size:0.7rem;">${Helpers.escapeHtml(ticket.qrToken || '')}</code></td>
      </tr>`).join('');

    return `
      <div class="admin-form-grid cols-2">
        <div><strong>Mã đặt vé</strong><br><code>${Helpers.escapeHtml(booking.id)}</code></div>
        <div><strong>Trạng thái</strong><br><span class="badge ${status.cls}">${status.label}</span></div>
        <div><strong>Người đặt</strong><br>${Helpers.escapeHtml(booking.user?.name || '')}<br><span style="color:var(--color-text-muted);">${Helpers.escapeHtml(booking.user?.email || '')}</span></div>
        <div><strong>Tổng tiền</strong><br><span style="color:var(--color-accent);font-weight:800;">${Helpers.formatCurrency(booking.totalAmount || 0)}</span></div>
        <div><strong>Phim</strong><br>${Helpers.escapeHtml(booking.movie?.title || '')}</div>
        <div><strong>Rạp / Phòng</strong><br>${Helpers.escapeHtml(booking.cinema?.name || '')}<br>${Helpers.escapeHtml(booking.room?.name || '')}</div>
        <div><strong>Suất chiếu</strong><br>${Helpers.formatDateTime(booking.showtime?.startAt)} - ${BookingView._time(booking.showtime?.endAt)}</div>
        <div><strong>QR booking</strong><br><code style="font-size:0.72rem;">${Helpers.escapeHtml(booking.bookingQrToken || '')}</code></div>
      </div>

      <h4 style="margin:18px 0 8px;">Ghế</h4>
      <table class="admin-table"><thead><tr><th>Ghế</th><th>Loại</th><th>Đơn giá</th></tr></thead><tbody>${seatRows || '<tr><td colspan="3">Không có ghế</td></tr>'}</tbody></table>

      <h4 style="margin:18px 0 8px;">Combo Bắp Nước</h4>
      <table class="admin-table"><thead><tr><th>Combo</th><th>SL</th><th>Đơn giá</th><th>Thành tiền</th></tr></thead><tbody>${comboRows || '<tr><td colspan="4">Không mua combo</td></tr>'}</tbody></table>

      <h4 style="margin:18px 0 8px;">Thanh Toán</h4>
      <table class="admin-table"><thead><tr><th>Provider</th><th>Trạng thái</th><th>Số tiền</th><th>Thời gian</th></tr></thead><tbody>${paymentRows || '<tr><td colspan="4">Chưa có payment</td></tr>'}</tbody></table>

      <h4 style="margin:18px 0 8px;">Vé / QR</h4>
      <table class="admin-table"><thead><tr><th>Ghế</th><th>Trạng thái</th><th>QR token</th></tr></thead><tbody>${ticketRows || '<tr><td colspan="3">Chưa phát hành vé</td></tr>'}</tbody></table>`;
  },

  _status(statusValue) {
    const statusMap = {
      paid: { label: 'Đã thanh toán', cls: 'badge-success' },
      pending: { label: 'Chờ thanh toán', cls: 'badge-warning' },
      cancelled: { label: 'Đã hủy', cls: 'badge-danger' },
      expired: { label: 'Hết hạn', cls: 'badge-secondary' },
      refunded: { label: 'Đã hoàn tiền', cls: 'badge-secondary' },
    };
    return statusMap[statusValue] || { label: statusValue || 'unknown', cls: 'badge-secondary' };
  },

  _time(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  },

  _filterTable(q) {
    const tbody = document.getElementById('bookings-admin-tbody');
    if (!tbody) return;
    tbody.querySelectorAll('tr').forEach((row) => {
      row.style.display = row.textContent.toLowerCase().includes(q.toLowerCase()) ? '' : 'none';
    });
  },
};
