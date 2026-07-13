/**
 * Mục đích: Lớp View dựng giao diện và cập nhật DOM cho miền đặt vé, thanh toán và vé điện tử.
 */
/* CineTicket - View quản trị đặt vé */
// Đối tượng BookingView đóng vai trò lớp hiển thị, dựng HTML và cập nhật DOM.
const BookingView = {
  _bookings: [],
  _summary: null,
  _activeStatus: 'all',
  _period: 'all',
  _query: '',

  // Dựng phần giao diện tương ứng trong khối renderAdmin.
  async renderAdmin() {
    // Kiểm tra trạng thái đăng nhập hoặc vai trò trước khi cho phép thao tác.
    if (!AuthController.requireAdmin()) return;
    document.body.classList.add('admin-layout');
    const main = document.getElementById('main-content');
    // Dừng hoặc đổi hướng luồng khi dữ liệu bắt buộc chưa sẵn sàng.
    if (!main) return;

    main.innerHTML = this._layout(`
      <div class="admin-table-card">
        <div class="admin-table-empty"><div class="spinner" style="margin:0 auto 16px;"></div>Đang tải dữ liệu booking từ PostgreSQL...</div>
      </div>
    `);

    // Bắt đầu thao tác có thể thất bại để hiển thị phản hồi phù hợp cho người dùng.
    try {
      const overview = await BookingModel.getOverview();
      this._bookings = overview.bookings;
      this._summary = overview.summary;
      this._activeStatus = 'all';
      this._period = 'all';
      this._query = '';
      main.innerHTML = this._layout(this._dashboard());
    } catch (error) {
      main.innerHTML = this._layout(`
        <div class="admin-table-card">
          <div class="admin-table-empty">
            <i class="fas fa-exclamation-triangle" style="color:var(--color-danger);font-size:1.6rem;margin-bottom:12px;"></i><br>
            Không kết nối được backend/database: ${Helpers.escapeHtml(error.message || 'Unknown error')}
          </div>
        </div>
      `);
    }
  },

  // Thực hiện trách nhiệm riêng của khối _layout.
  _layout(content) {
    return `
    <div class="admin-layout-wrap">
      ${UserView._renderAdminSidebar('bookings')}
      <div class="admin-main">
        ${UserView._renderAdminTopbar('Quản Lý Đặt Vé', 'admin/bookings')}
        <div class="admin-content booking-admin-page">
          <div class="admin-page-header booking-admin-heading">
            <div>
              <h1 class="admin-page-title">Booking & Thanh Toán</h1>
              <p class="admin-page-subtitle">Theo dõi doanh thu, trạng thái đơn và giao dịch từ PostgreSQL</p>
            </div>
            <div class="admin-page-actions">
              <select class="form-control booking-period-select" onchange="BookingView._setPeriod(this.value)">
                <option value="all">Tất cả thời gian</option>
                <option value="today">Hôm nay</option>
                <option value="7">7 ngày gần nhất</option>
                <option value="30">30 ngày gần nhất</option>
              </select>
              <button class="btn btn-outline" onclick="BookingView.exportCsv()"><i class="fas fa-file-export"></i> Xuất CSV</button>
            </div>
          </div>
          ${content}
        </div>
      </div>
    </div>`;
  },

  // Thực hiện trách nhiệm riêng của khối _dashboard.
  _dashboard() {
    const summary = this._summary || {};
    const pending = summary.status?.pending || { count: 0, amount: 0 };

    return `
      <section class="booking-overview-grid">
        <article class="booking-balance-card">
          <div class="booking-card-kicker">Tổng doanh thu booking đã thanh toán</div>
          <div class="booking-balance-row">
            <div>
              <div class="booking-balance-value">${Helpers.formatCurrency(summary.paidRevenue || 0)}</div>
              <div class="booking-balance-meta">${summary.totalBookings || 0} booking trong hệ thống · Đơn vị VND</div>
            </div>
            <div class="booking-balance-icon"><i class="fas fa-ticket-alt"></i></div>
          </div>
          <div class="booking-balance-actions">
            <button class="btn btn-primary" onclick="BookingView._filterStatus('paid')"><i class="fas fa-receipt"></i> Xem đơn đã trả</button>
            <button class="btn btn-outline" onclick="BookingView.exportCsv()"><i class="fas fa-download"></i> Tải dữ liệu</button>
          </div>
        </article>

        <article class="booking-attention-card">
          <div>
            <div class="booking-attention-label"><i class="fas fa-clock"></i> Cần theo dõi</div>
            <h3>${pending.count} booking đang chờ thanh toán</h3>
            <p>Tổng giá trị tạm tính ${Helpers.formatCurrency(pending.amount)}. Booking quá hạn sẽ được giải phóng ghế theo quy trình hệ thống.</p>
            <button onclick="BookingView._filterStatus('pending')">Xem booking chờ <i class="fas fa-arrow-right"></i></button>
          </div>
          <div class="booking-attention-visual"><i class="fas fa-hourglass-half"></i></div>
        </article>
      </section>

      <section class="booking-status-grid">
        ${this._statusCard('paid', 'Đã thanh toán', 'fas fa-check-circle', 'green')}
        ${this._statusCard('pending', 'Chờ thanh toán', 'fas fa-clock', 'yellow')}
        ${this._statusCard('cancelled', 'Đã hủy', 'fas fa-ban', 'red')}
        ${this._statusCard('expired', 'Hết hạn / hoàn tiền', 'fas fa-history', 'gray', ['expired', 'refunded'])}
      </section>

      <section class="booking-content-grid">
        ${this._table()}
        ${this._paymentBreakdown()}
      </section>`;
  },

  // Dựng phần giao diện tương ứng trong khối _statusCard.
  _statusCard(status, label, icon, tone, combinedStatuses = [status]) {
    const data = combinedStatuses.reduce((result, key) => {
      const current = this._summary?.status?.[key] || {};
      result.count += current.count || 0;
      result.amount += current.amount || 0;
      return result;
    }, { count: 0, amount: 0 });

    return `
      <button class="booking-status-card ${this._activeStatus === status ? 'active' : ''}" data-booking-status="${status}" onclick="BookingView._filterStatus('${status}')">
        <div class="booking-status-card-top">
          <span>${label}</span>
          <span class="booking-status-icon ${tone}"><i class="${icon}"></i></span>
        </div>
        <strong>${data.count}</strong>
        <small>${Helpers.formatCurrency(data.amount)}</small>
      </button>`;
  },

  // Thực hiện trách nhiệm riêng của khối _table.
  _table() {
    return `
      <div class="admin-table-card booking-transactions-card">
        <div class="admin-table-header booking-table-header">
          <div>
            <span class="admin-table-title">Booking gần nhất</span>
            <div class="booking-table-count" id="booking-filter-count">${this._bookings.length} kết quả</div>
          </div>
          <div class="booking-search-wrap">
            <i class="fas fa-search"></i>
            <input type="search" placeholder="Mã booking, phim, khách hàng..." oninput="BookingView._setQuery(this.value)" />
          </div>
        </div>
        <div class="table-wrapper">
          <table class="admin-table booking-transactions-table">
            <thead><tr>
              <th>Booking</th><th>Khách hàng</th><th>Ghế</th><th>Thanh toán</th><th>Số tiền</th><th>Trạng thái</th><th>Thời gian</th><th></th>
            </tr></thead>
            <tbody id="bookings-admin-tbody">${this._renderRows(this._filteredBookings())}</tbody>
          </table>
        </div>
      </div>`;
  },

  // Dựng phần giao diện tương ứng trong khối _renderRows.
  _renderRows(bookings) {
    return bookings.length
      ? bookings.map((booking) => this._row(booking)).join('')
      : '<tr><td colspan="8" class="admin-table-empty">Không có booking phù hợp với bộ lọc</td></tr>';
  },

  // Dựng phần giao diện tương ứng trong khối _row.
  _row(booking) {
    const status = this._status(booking.status);
    const seats = (booking.seats || []).map((seat) => typeof seat === 'object' ? seat.id : seat).join(', ');
    const provider = this._providerLabel(booking.paymentProvider);

    return `<tr>
      <td>
        <button class="booking-code-link" onclick="BookingView.showDetail('${booking.id}')">${booking.id.slice(0, 10).toUpperCase()}</button>
        <div class="booking-movie-name">${Helpers.escapeHtml(Helpers.truncate(booking.movieTitle || 'N/A', 28))}</div>
      </td>
      <td><div class="booking-customer-name">${Helpers.escapeHtml(booking.userName || 'N/A')}</div><div class="booking-customer-email">${Helpers.escapeHtml(booking.userEmail || '')}</div></td>
      <td><span class="booking-seat-list">${Helpers.escapeHtml(seats || '-')}</span></td>
      <td><span class="booking-provider"><i class="fas fa-credit-card"></i>${Helpers.escapeHtml(provider)}</span></td>
      <td class="booking-amount">${Helpers.formatCurrency(booking.totalAmount || 0)}</td>
      <td><span class="badge ${status.cls}">${status.label}</span></td>
      <td><div class="booking-date">${Helpers.formatDate(booking.createdAt)}</div><div class="booking-time">${Helpers.formatTimeOfDay(booking.createdAt)}</div></td>
      <td><div class="table-actions">
        <button class="action-btn view" onclick="BookingView.showDetail('${booking.id}')" title="Xem chi tiết"><i class="fas fa-arrow-right"></i></button>
      </div></td>
    </tr>`;
  },

  // Thực hiện bước thanh toán trong khối _paymentBreakdown với kiểm tra trạng thái an toàn.
  _paymentBreakdown() {
    const providers = this._summary?.paymentProviders || [];
    const total = providers.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const colors = ['#e50914', '#17a2b8', '#ffc107', '#28a745', '#7c3aed', '#6c757d'];
    let cursor = 0;
    const stops = providers.map((item, index) => {
      const start = cursor;
      cursor += total ? Number(item.amount || 0) / total * 100 : 0;
      return `${colors[index % colors.length]} ${start}% ${cursor}%`;
    });
    const background = stops.length ? `conic-gradient(${stops.join(',')})` : 'var(--color-border)';

    return `
      <aside class="admin-table-card booking-breakdown-card">
        <div class="admin-table-header"><div><span class="admin-table-title">Phương thức thanh toán</span><div class="booking-table-count">Giao dịch thành công</div></div></div>
        <div class="booking-breakdown-body">
          <div class="booking-donut" style="--booking-donut:${background}">
            <div><span>Tổng cộng</span><strong>${Helpers.formatCurrency(total)}</strong></div>
          </div>
          <div class="booking-provider-legend">
            ${providers.length ? providers.map((item, index) => {
              const percent = total ? Math.round(Number(item.amount || 0) / total * 100) : 0;
              return `<div class="booking-provider-row"><span class="booking-provider-dot" style="background:${colors[index % colors.length]}"></span><div><strong>${Helpers.escapeHtml(this._providerLabel(item.provider))}</strong><small>${item.count} giao dịch</small></div><span>${percent}%</span></div>`;
            }).join('') : '<div class="admin-table-empty" style="padding:24px 0;">Chưa có giao dịch thành công</div>'}
          </div>
        </div>
      </aside>`;
  },

  // Đọc và lọc dữ liệu cần thiết trong khối _filteredBookings.
  _filteredBookings() {
    const now = new Date();
    const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let cutoff = null;
    // Đánh giá điều kiện hiện tại để cập nhật giao diện và trạng thái đúng nhánh.
    if (this._period === 'today') cutoff = startToday;
    // Đánh giá điều kiện hiện tại để cập nhật giao diện và trạng thái đúng nhánh.
    if (['7', '30'].includes(this._period)) {
      cutoff = new Date(startToday);
      cutoff.setDate(cutoff.getDate() - Number(this._period) + 1);
    }

    return this._bookings.filter((booking) => {
      const matchesStatus = this._activeStatus === 'all'
        || booking.status === this._activeStatus
        || (this._activeStatus === 'expired' && booking.status === 'refunded');
      const matchesPeriod = !cutoff || new Date(booking.createdAt) >= cutoff;
      const haystack = [booking.id, booking.movieTitle, booking.userName, booking.userEmail, booking.cinemaName, booking.paymentProvider]
        .filter(Boolean).join(' ').toLowerCase();
      return matchesStatus && matchesPeriod && haystack.includes(this._query.toLowerCase());
    });
  },

  // Thực hiện trách nhiệm riêng của khối _refreshTable.
  _refreshTable() {
    const filtered = this._filteredBookings();
    const tbody = document.getElementById('bookings-admin-tbody');
    const count = document.getElementById('booking-filter-count');
    // Đánh giá điều kiện hiện tại để cập nhật giao diện và trạng thái đúng nhánh.
    if (tbody) tbody.innerHTML = this._renderRows(filtered);
    // Xử lý riêng trường hợp danh sách rỗng hoặc có số lượng không hợp lệ.
    if (count) count.textContent = `${filtered.length} kết quả`;
  },

  // Đọc và lọc dữ liệu cần thiết trong khối _filterStatus.
  _filterStatus(status) {
    this._activeStatus = this._activeStatus === status ? 'all' : status;
    document.querySelectorAll('[data-booking-status]').forEach((card) => {
      card.classList.toggle('active', card.dataset.bookingStatus === this._activeStatus);
    });
    this._refreshTable();
    document.querySelector('.booking-transactions-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  },

  // Cập nhật trạng thái hoặc dữ liệu trong khối _setPeriod.
  _setPeriod(period) { this._period = period; this._refreshTable(); },
  // Cập nhật trạng thái hoặc dữ liệu trong khối _setQuery.
  _setQuery(query) { this._query = query.trim(); this._refreshTable(); },

  // Thực hiện trách nhiệm riêng của khối exportCsv.
  exportCsv() {
    const bookings = this._filteredBookings();
    // Kiểm tra trạng thái booking hoặc thanh toán để chọn bước giao diện tiếp theo.
    if (!bookings.length) { Toast.warning('Không có booking để xuất'); return; }
    const csvCell = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const rows = [
      ['Mã booking', 'Phim', 'Khách hàng', 'Email', 'Rạp', 'Ghế', 'Phương thức', 'Tổng tiền', 'Trạng thái', 'Ngày đặt'],
      ...bookings.map((booking) => [
        booking.id, booking.movieTitle, booking.userName, booking.userEmail, booking.cinemaName,
        (booking.seats || []).map((seat) => seat.id || seat).join(', '), this._providerLabel(booking.paymentProvider),
        booking.totalAmount, this._status(booking.status).label, Helpers.formatDateTime(booking.createdAt),
      ]),
    ];
    const blob = new Blob(['\uFEFF' + rows.map((row) => row.map(csvCell).join(',')).join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `booking-${Helpers.getDateString(new Date())}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    Toast.success(`Đã xuất ${bookings.length} booking`);
  },

  // Dựng phần giao diện tương ứng trong khối showDetail.
  async showDetail(bookingId) {
    try {
      const booking = await BookingModel.getDetail(bookingId);
      Modal.show('Chi Tiết Đặt Vé', this._detailHtml(booking), { size: 'lg' });
    } catch (error) {
      Toast.error(error.message || 'Không thể tải chi tiết đặt vé');
    }
  },

  // Dựng phần giao diện tương ứng trong khối _detailHtml.
  _detailHtml(booking) {
    const status = this._status(String(booking.status || '').toLowerCase());
    const seatRows = (booking.seats || []).map((seat) => `<tr><td>${Helpers.escapeHtml(seat.id || `${seat.row}${seat.number}`)}</td><td>${Helpers.escapeHtml(seat.type || '')}</td><td>${Helpers.formatCurrency(seat.unitPrice || 0)}</td></tr>`).join('');
    const comboRows = (booking.comboItems || []).map((item) => `<tr><td>${Helpers.escapeHtml(item.name || '')}</td><td>${item.quantity}</td><td>${Helpers.formatCurrency(item.unitPrice || 0)}</td><td>${Helpers.formatCurrency(item.lineTotal || 0)}</td></tr>`).join('');
    const paymentRows = (booking.payments || []).map((payment) => `<tr><td>${Helpers.escapeHtml(this._providerLabel(payment.provider))}</td><td>${Helpers.escapeHtml(payment.status || '')}</td><td>${Helpers.formatCurrency(payment.amount || 0)}</td><td>${payment.paidAt ? Helpers.formatDateTime(payment.paidAt) : '-'}</td></tr>`).join('');
    const ticketRows = (booking.tickets || []).map((ticket) => `<tr><td>${Helpers.escapeHtml(ticket.seat ? ticket.seat.id : '')}</td><td>${Helpers.escapeHtml(ticket.status || '')}</td><td><code style="font-size:0.7rem;">${Helpers.escapeHtml(ticket.qrToken || '')}</code></td></tr>`).join('');

    return `
      <div class="admin-form-grid cols-2">
        <div><strong>Mã đặt vé</strong><br><code>${Helpers.escapeHtml(booking.id)}</code></div>
        <div><strong>Trạng thái</strong><br><span class="badge ${status.cls}">${status.label}</span></div>
        <div><strong>Người đặt</strong><br>${Helpers.escapeHtml(booking.user?.name || '')}<br><span style="color:var(--color-text-muted);">${Helpers.escapeHtml(booking.user?.email || '')}</span></div>
        <div><strong>Tổng tiền</strong><br><span style="color:var(--color-accent);font-weight:800;">${Helpers.formatCurrency(booking.totalAmount || 0)}</span></div>
        <div><strong>Phim</strong><br>${Helpers.escapeHtml(booking.movie?.title || '')}</div>
        <div><strong>Rạp / Phòng</strong><br>${Helpers.escapeHtml(booking.cinema?.name || '')}<br>${Helpers.escapeHtml(booking.room?.name || '')}</div>
        <div><strong>Suất chiếu</strong><br>${Helpers.formatDateTime(booking.showtime?.startAt)} - ${Helpers.formatTimeOfDay(booking.showtime?.endAt)}</div>
        <div><strong>QR booking</strong><br><code style="font-size:0.72rem;">${Helpers.escapeHtml(booking.bookingQrToken || '')}</code></div>
      </div>
      <h4 style="margin:18px 0 8px;">Ghế</h4><table class="admin-table"><thead><tr><th>Ghế</th><th>Loại</th><th>Đơn giá</th></tr></thead><tbody>${seatRows || '<tr><td colspan="3">Không có ghế</td></tr>'}</tbody></table>
      <h4 style="margin:18px 0 8px;">Combo Bắp Nước</h4><table class="admin-table"><thead><tr><th>Combo</th><th>SL</th><th>Đơn giá</th><th>Thành tiền</th></tr></thead><tbody>${comboRows || '<tr><td colspan="4">Không mua combo</td></tr>'}</tbody></table>
      <h4 style="margin:18px 0 8px;">Thanh Toán</h4><table class="admin-table"><thead><tr><th>Provider</th><th>Trạng thái</th><th>Số tiền</th><th>Thời gian</th></tr></thead><tbody>${paymentRows || '<tr><td colspan="4">Chưa có payment</td></tr>'}</tbody></table>
      <h4 style="margin:18px 0 8px;">Vé / QR</h4><table class="admin-table"><thead><tr><th>Ghế</th><th>Trạng thái</th><th>QR token</th></tr></thead><tbody>${ticketRows || '<tr><td colspan="3">Chưa phát hành vé</td></tr>'}</tbody></table>`;
  },

  // Thực hiện trách nhiệm riêng của khối _providerLabel.
  _providerLabel(provider) {
    // Kiểm tra trạng thái booking hoặc thanh toán để chọn bước giao diện tiếp theo.
    if (!provider) return 'Chưa thanh toán';
    const labels = { sepay: 'SePay', vnpay: 'VNPay', momo: 'MoMo', zalopay: 'ZaloPay', card: 'Thẻ ngân hàng', mock: 'Thanh toán demo' };
    const normalized = String(provider).toLowerCase().replace(/-demo$/, '');
    return labels[normalized] || provider;
  },

  // Thực hiện trách nhiệm riêng của khối _status.
  _status(statusValue) {
    const statusMap = {
      paid: { label: 'Đã thanh toán', cls: 'badge-success' }, pending: { label: 'Chờ thanh toán', cls: 'badge-warning' },
      cancelled: { label: 'Đã hủy', cls: 'badge-danger' }, expired: { label: 'Hết hạn', cls: 'badge-secondary' },
      refunded: { label: 'Đã hoàn tiền', cls: 'badge-secondary' },
    };
    return statusMap[statusValue] || { label: statusValue || 'unknown', cls: 'badge-secondary' };
  },
};
