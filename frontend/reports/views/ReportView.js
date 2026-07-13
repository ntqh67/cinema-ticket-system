/* CineTicket - Report View */
const ReportView = {
  async renderReport() {
    await this.renderDashboard({ reportMode: true });
  },

  async renderRevenue() {
    await this.renderDashboard({ revenueOnly: true });
  },

  async renderDashboard(options = {}) {
    if (!AuthController.requireAdmin()) return;
    document.body.classList.add('admin-layout');
    const main = document.getElementById('main-content');
    if (!main) return;

    main.innerHTML = `
      <div class="admin-layout-wrap">
        ${UserView._renderAdminSidebar(options.revenueOnly ? 'revenue' : options.reportMode ? 'reports' : 'dashboard')}
        <div class="admin-main">
          ${UserView._renderAdminTopbar(options.revenueOnly ? 'Quản Lý Doanh Thu' : options.reportMode ? 'Báo Cáo' : 'Dashboard', 'admin')}
          <div class="admin-content">
            <div class="admin-table-card">
              <div class="admin-table-empty">Dang tai dashboard tu PostgreSQL...</div>
            </div>
          </div>
        </div>
      </div>`;

    let summary;
    try {
      summary = await ReportController.getSummary();
    } catch (error) {
      main.querySelector('.admin-content').innerHTML = `
        <div class="admin-table-card">
          <div class="admin-table-empty">Khong tai duoc dashboard: ${Helpers.escapeHtml(error.message || 'Backend unavailable')}</div>
        </div>`;
      return;
    }

    const cards = [
      { label: 'Phim', value: summary.movies, icon: 'film', color: 'var(--color-primary)' },
      { label: 'Rap Chieu', value: summary.cinemas, icon: 'building', color: 'var(--color-info)' },
      { label: 'Suat Chieu', value: summary.showtimes, icon: 'calendar-alt', color: 'var(--color-warning)' },
      { label: 'Nguoi Dung', value: summary.users, icon: 'users', color: 'var(--color-success)' },
      { label: 'Dat Ve Da Thanh Toan', value: summary.bookings, icon: 'ticket-alt', color: 'var(--color-accent)' },
      { label: 'Doanh Thu', value: Helpers.formatCurrency(summary.revenue), icon: 'chart-line', color: 'var(--color-danger)' }
    ];
    const visibleCards = options.revenueOnly
      ? cards.filter((card) => ['Dat Ve Da Thanh Toan', 'Doanh Thu'].includes(card.label))
      : cards;

    main.innerHTML = `
      <div class="admin-layout-wrap">
        ${UserView._renderAdminSidebar(options.revenueOnly ? 'revenue' : options.reportMode ? 'reports' : 'dashboard')}
        <div class="admin-main">
          ${UserView._renderAdminTopbar(options.revenueOnly ? 'Quản Lý Doanh Thu' : options.reportMode ? 'Báo Cáo' : 'Dashboard', 'admin')}
          <div class="admin-content">
            <div class="admin-page-header">
              <div>
                <h1 class="admin-page-title">${options.revenueOnly ? 'Doanh Thu' : options.reportMode ? 'Báo Cáo Hệ Thống' : 'Tổng Quan'}</h1>
                <p class="admin-page-subtitle">Dữ liệu thanh toán thành công từ PostgreSQL</p>
              </div>
            </div>
            <div class="dashboard-grid">
              ${visibleCards.map(card => `
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
