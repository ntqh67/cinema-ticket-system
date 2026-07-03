/* CineTicket - Booking View (Admin) */
const BookingView = {
  renderAdmin() {
    if (!AuthController.requireAdmin()) return;
    document.body.classList.add('admin-layout');
    const bookings = BookingModel.getAll().reverse();
    const main = document.getElementById('main-content');
    if (!main) return;

    const statusMap = {
      confirmed: { label: 'Đã xác nhận', cls: 'badge-success' },
      pending: { label: 'Chờ xử lý', cls: 'badge-warning' },
      cancelled: { label: 'Đã hủy', cls: 'badge-danger' },
      used: { label: 'Đã dùng', cls: 'badge-secondary' }
    };

    main.innerHTML = `
    <div class="admin-layout-wrap">
      ${UserView._renderAdminSidebar('bookings')}
      <div class="admin-main">
        ${UserView._renderAdminTopbar('Quản Lý Đặt Vé', 'admin/bookings')}
        <div class="admin-content">
          <div class="admin-page-header">
            <div>
              <h1 class="admin-page-title">Đặt Vé</h1>
              <p class="admin-page-subtitle">${bookings.length} đơn đặt vé trong hệ thống</p>
            </div>
          </div>
          <div class="admin-table-card">
            <div class="admin-table-header">
              <span class="admin-table-title">Danh Sách Đặt Vé</span>
              <div class="admin-table-actions">
                <input type="text" class="form-control" placeholder="Tìm kiếm..." style="width:200px;" oninput="BookingView._filterTable(this.value)" />
              </div>
            </div>
            <div class="table-wrapper">
              <table class="admin-table">
                <thead><tr>
                  <th>Mã ĐV</th><th>Phim</th><th>Người Đặt</th><th>Ghế</th><th>Tổng Tiền</th><th>Trạng Thái</th><th>Ngày Đặt</th><th>Hành Động</th>
                </tr></thead>
                <tbody id="bookings-admin-tbody">
                  ${bookings.length === 0 ? `<tr><td colspan="8" class="admin-table-empty">Chưa có đơn đặt vé nào</td></tr>` :
                    bookings.map(b => {
                      const movie = MovieModel.getById(b.movieId);
                      const user = API.mockData.users.find(u => u.id === b.userId);
                      const showtime = ShowtimeModel.getById(b.showtimeId);
                      const st = statusMap[b.status] || { label: b.status, cls: 'badge-secondary' };
                      return `<tr>
                        <td><code style="font-size:0.75rem;">${b.id.slice(0,10).toUpperCase()}</code></td>
                        <td style="font-size:0.8rem;font-weight:600;">${movie ? Helpers.escapeHtml(Helpers.truncate(movie.title, 25)) : 'N/A'}</td>
                        <td style="font-size:0.8rem;">${user ? Helpers.escapeHtml(user.name) : 'N/A'}</td>
                        <td><div style="display:flex;flex-wrap:wrap;gap:4px;">${(b.seats||[]).map(s=>typeof s==='object'?s.id:s).map(s=>`<span class="badge badge-secondary" style="font-size:0.65rem;">${s}</span>`).join('')}</div></td>
                        <td style="color:var(--color-accent);font-weight:700;">${Helpers.formatCurrency(b.totalAmount || b.totalPrice)}</td>
                        <td><span class="badge ${st.cls}">${st.label}</span></td>
                        <td style="font-size:0.8rem;">${Helpers.formatDate(b.createdAt)}</td>
                        <td><div class="table-actions">
                          <button class="action-btn view" onclick="Router.navigate('/ticket/${b.id}')" title="Xem vé"><i class="fas fa-eye"></i></button>
                          ${b.status !== 'cancelled' ? `<button class="action-btn delete" onclick="BookingController.handleCancel('${b.id}')" title="Hủy"><i class="fas fa-times"></i></button>` : ''}
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

  _filterTable(q) {
    const tbody = document.getElementById('bookings-admin-tbody');
    if (!tbody) return;
    tbody.querySelectorAll('tr').forEach(r => { r.style.display = r.textContent.toLowerCase().includes(q.toLowerCase()) ? '' : 'none'; });
  }
};
