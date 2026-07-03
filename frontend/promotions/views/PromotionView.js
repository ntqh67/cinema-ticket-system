/* CineTicket - Promotion View */
const PromotionView = {
  renderList() {
    const promotions = PromotionModel.getActive();
    const main = document.getElementById('main-content');
    if (!main) return;
    document.getElementById('footer').style.display = '';

    main.innerHTML = `
      <div class="page-wrapper">
        <div class="container">
          <div class="movies-page-header">
            <h1 class="section-title movies-page-title" style="margin-bottom:0;">Khuyến Mãi</h1>
          </div>
          <div class="promotions-grid">
            ${promotions.map(promo => this._promotionCard(promo)).join('')}
          </div>
        </div>
      </div>`;
  },

  renderAdmin() {
    if (!AuthController.requireAdmin()) return;
    document.body.classList.add('admin-layout');
    const promotions = PromotionModel.getAll();
    const main = document.getElementById('main-content');
    if (!main) return;

    main.innerHTML = `
      <div class="admin-layout-wrap">
        ${UserView._renderAdminSidebar('promotions')}
        <div class="admin-main">
          ${UserView._renderAdminTopbar('Quản Lý Khuyến Mãi', 'admin/promotions')}
          <div class="admin-content">
            <div class="admin-page-header">
              <div>
                <h1 class="admin-page-title">Khuyến Mãi</h1>
                <p class="admin-page-subtitle">${promotions.length} chương trình trong hệ thống</p>
              </div>
            </div>
            <div class="admin-table-card">
              <div class="admin-table-header">
                <span class="admin-table-title">Danh Sách Khuyến Mãi</span>
              </div>
              <div class="table-wrapper">
                <table class="admin-table">
                  <thead>
                    <tr><th>Mã</th><th>Tên</th><th>Giảm Giá</th><th>Thời Gian</th><th>Lượt Dùng</th><th>Trạng Thái</th><th>Hành Động</th></tr>
                  </thead>
                  <tbody>
                    ${promotions.map(promo => `
                      <tr>
                        <td><span class="badge badge-info">${Helpers.escapeHtml(promo.code)}</span></td>
                        <td style="font-weight:600;">${Helpers.escapeHtml(promo.title)}</td>
                        <td>${promo.discountType === 'percent' ? Math.round(promo.discount * 100) + '%' : Helpers.formatCurrency(promo.discount)}</td>
                        <td>${Helpers.formatDate(promo.startDate)} - ${Helpers.formatDate(promo.endDate)}</td>
                        <td>${promo.usedCount}/${promo.usageLimit}</td>
                        <td><span class="badge ${promo.isActive ? 'badge-success' : 'badge-secondary'}">${promo.isActive ? 'Hoạt động' : 'Tắt'}</span></td>
                        <td>
                          <div class="table-actions">
                            <button class="action-btn edit" onclick="PromotionController.handleToggle('${promo.id}')" title="Bật/tắt"><i class="fas fa-power-off"></i></button>
                            <button class="action-btn delete" onclick="PromotionController.handleDelete('${promo.id}')" title="Xóa"><i class="fas fa-trash"></i></button>
                          </div>
                        </td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>`;
  },

  _promotionCard(promo) {
    const discount = promo.discountType === 'percent'
      ? `${Math.round(promo.discount * 100)}%`
      : Helpers.formatCurrency(promo.discount);

    return `
      <div class="card promo-card">
        <div class="promo-card-banner" style="background:${promo.color};">
          <img src="${promo.image}" alt="${Helpers.escapeHtml(promo.title)}" style="width:100%;height:100%;object-fit:cover;mix-blend-mode:overlay;opacity:.55;" onerror="this.style.display='none'">
          <div class="promo-card-discount">
            <div style="font-size:2rem;font-weight:800;">${discount}</div>
            <div style="font-weight:700;letter-spacing:.08em;">${Helpers.escapeHtml(promo.code)}</div>
          </div>
        </div>
        <div class="card-body promo-card-body">
          <div class="promo-card-content">
            <h3 style="margin-bottom:10px;">${Helpers.escapeHtml(promo.title)}</h3>
            <p style="color:var(--color-text-muted);margin-bottom:0;">${Helpers.escapeHtml(promo.description)}</p>
          </div>
          <div class="promo-card-footer">
            <span class="badge badge-success">Đến ${Helpers.formatDate(promo.endDate)}</span>
            <button class="btn btn-primary btn-block" onclick="Router.navigate('/movies')"><i class="fas fa-ticket-alt"></i> Dùng Ngay</button>
          </div>
        </div>
      </div>`;
  }
};
