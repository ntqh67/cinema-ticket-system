/* CineTicket - Cinema View */
const CinemaView = {
  renderList() {
    document.getElementById('footer').style.display = '';
    const cinemas = CinemaModel.getAll();
    const main = document.getElementById('main-content');
    if (!main) return;
    main.innerHTML = `
    <div class="page-wrapper">
      <div class="container">
        <h1 class="section-title">Hệ Thống Rạp Chiếu</h1>
        <div class="grid grid-3" style="gap:24px;" id="cinemas-grid">
          ${cinemas.map(c => this._cinemaCard(c)).join('')}
        </div>
      </div>
    </div>`;
  },

  _cinemaCard(c) {
    const rooms = API.mockData.rooms.filter(r => r.cinemaId === c.id);
    return `
    <div class="card" style="cursor:pointer;" onclick="Toast.info('Chi tiết rạp đang phát triển')">
      <img src="${c.image}" alt="${Helpers.escapeHtml(c.name)}" style="width:100%;height:180px;object-fit:cover;" onerror="this.src='https://picsum.photos/600/400?grayscale'" />
      <div class="card-body">
        <h4 style="margin-bottom:8px;">${Helpers.escapeHtml(c.name)}</h4>
        <p style="font-size:0.875rem;color:var(--color-text-muted);margin-bottom:12px;">
          <i class="fas fa-map-marker-alt" style="color:var(--color-primary);"></i> ${Helpers.escapeHtml(c.address)}
        </p>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;">
          ${c.facilities.map(f => `<span class="badge badge-secondary">${Helpers.escapeHtml(f)}</span>`).join('')}
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between;font-size:0.875rem;color:var(--color-text-muted);">
          <span><i class="fas fa-door-open"></i> ${rooms.length} phòng chiếu</span>
          <span><i class="fas fa-phone"></i> ${c.phone}</span>
        </div>
      </div>
    </div>`;
  },

  renderAdmin() {
    if (!AuthController.requireAdmin()) return;
    document.body.classList.add('admin-layout');
    const cinemas = CinemaModel.getAll();
    const main = document.getElementById('main-content');
    if (!main) return;
    main.innerHTML = `
    <div class="admin-layout-wrap">
      ${UserView._renderAdminSidebar('cinemas')}
      <div class="admin-main">
        ${UserView._renderAdminTopbar('Quản Lý Rạp Chiếu', 'admin/cinemas')}
        <div class="admin-content">
          <div class="admin-page-header">
            <div>
              <h1 class="admin-page-title">Rạp Chiếu</h1>
              <p class="admin-page-subtitle">${cinemas.length} rạp trong hệ thống</p>
            </div>
            <div class="admin-page-actions">
              <button class="btn btn-primary" onclick="Toast.info('Tính năng thêm rạp đang phát triển')"><i class="fas fa-plus"></i> Thêm Rạp</button>
            </div>
          </div>
          <div class="grid grid-3" style="gap:20px;">
            ${cinemas.map(c => {
              const rooms = API.mockData.rooms.filter(r => r.cinemaId === c.id);
              return `
              <div class="card">
                <img src="${c.image}" alt="${Helpers.escapeHtml(c.name)}" style="width:100%;height:160px;object-fit:cover;" onerror="this.src='https://picsum.photos/600/400?grayscale'" />
                <div class="card-body">
                  <h4 style="margin-bottom:6px;">${Helpers.escapeHtml(c.name)}</h4>
                  <p style="font-size:0.8rem;color:var(--color-text-muted);margin-bottom:8px;">${Helpers.escapeHtml(c.address)}</p>
                  <div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap;">
                    ${c.facilities.slice(0,3).map(f => `<span class="badge badge-secondary" style="font-size:0.65rem;">${Helpers.escapeHtml(f)}</span>`).join('')}
                  </div>
                  <div style="font-size:0.8rem;color:var(--color-text-muted);margin-bottom:12px;">
                    <i class="fas fa-door-open"></i> ${rooms.length} phòng &nbsp;|&nbsp; <i class="fas fa-phone"></i> ${c.phone}
                  </div>
                  <div class="table-actions">
                    <button class="action-btn edit" onclick="Toast.info('Chỉnh sửa rạp')" title="Sửa"><i class="fas fa-edit"></i></button>
                    <button class="action-btn delete" onclick="CinemaController.handleDelete('${c.id}')" title="Xóa"><i class="fas fa-trash"></i></button>
                  </div>
                </div>
              </div>`;
            }).join('')}
          </div>
        </div>
      </div>
    </div>`;
  }
};
