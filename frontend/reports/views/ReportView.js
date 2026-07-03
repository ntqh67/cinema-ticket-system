/* CineTicket - Report View */
const ReportView = {
  renderDashboard() {
    if (!AuthController.requireAdmin()) return;
    document.body.classList.add('admin-layout');
    const summary = ReportController.getSummary();
    const main = document.getElementById('main-content');
    if (!main) return;

    const cards = [
      { label: 'Phim', value: summary.movies, icon: 'film', color: 'var(--color-primary)' },
      { label: 'Rạp Chiếu', value: summary.cinemas, icon: 'building', color: 'var(--color-info)' },
      { label: 'Suất Chiếu', value: summary.showtimes, icon: 'calendar-alt', color: 'var(--color-warning)' },
      { label: 'Người Dùng', value: summary.users, icon: 'users', color: 'var(--color-success)' },
      { label: 'Đặt Vé', value: summary.bookings, icon: 'ticket-alt', color: 'var(--color-accent)' },
      { label: 'Doanh Thu', value: Helpers.formatCurrency(summary.revenue), icon: 'chart-line', color: 'var(--color-danger)' }
    ];

    main.innerHTML = `
      <div class="admin-layout-wrap">
        ${UserView._renderAdminSidebar('dashboard')}
        <div class="admin-main">
          ${UserView._renderAdminTopbar('Dashboard', 'admin')}
          <div class="admin-content">
            <div class="admin-page-header">
              <div>
                <h1 class="admin-page-title">Tổng Quan</h1>
                <p class="admin-page-subtitle">Dữ liệu demo từ mock data của CineTicket</p>
              </div>
            </div>
            <div class="dashboard-grid">
              ${cards.map(card => `
                <div class="dashboard-card">
                  <div class="dashboard-card-body">
                    <div style="display:flex;justify-content:space-between;align-items:center;gap:16px;">
                      <div>
                        <div style="color:var(--color-text-muted);font-size:.875rem;margin-bottom:8px;">${card.label}</div>
                        <div style="font-size:1.75rem;font-weight:800;">${card.value}</div>
                      </div>
                      <div style="width:48px;height:48px;border-radius:12px;background:${card.color};display:flex;align-items:center;justify-content:center;color:#fff;">
                        <i class="fas fa-${card.icon}"></i>
                      </div>
                    </div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      </div>`;
  }
};
