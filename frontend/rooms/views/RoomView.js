/* CineTicket - Room View */
const RoomView = {
  renderAdmin() {
    if (!AuthController.requireAdmin()) return;
    document.body.classList.add('admin-layout');
    const rooms = RoomModel.getAll();
    const main = document.getElementById('main-content');
    if (!main) return;
    main.innerHTML = `
    <div class="admin-layout-wrap">
      ${UserView._renderAdminSidebar('rooms')}
      <div class="admin-main">
        ${UserView._renderAdminTopbar('Quản Lý Phòng Chiếu', 'admin/rooms')}
        <div class="admin-content">
          <div class="admin-page-header">
            <div>
              <h1 class="admin-page-title">Phòng Chiếu</h1>
              <p class="admin-page-subtitle">${rooms.length} phòng trong hệ thống</p>
            </div>
            <div class="admin-page-actions">
              <button class="btn btn-primary" onclick="Toast.info('Tính năng thêm phòng đang phát triển')"><i class="fas fa-plus"></i> Thêm Phòng</button>
            </div>
          </div>
          <div class="admin-table-card">
            <div class="admin-table-header">
              <span class="admin-table-title">Danh Sách Phòng Chiếu</span>
            </div>
            <div class="table-wrapper">
              <table class="admin-table">
                <thead><tr>
                  <th>Tên Phòng</th><th>Rạp Chiếu</th><th>Loại</th><th>Sức Chứa</th><th>Hàng × Cột</th><th>Hành Động</th>
                </tr></thead>
                <tbody>
                  ${rooms.map(r => {
                    const cinema = CinemaModel.getById(r.cinemaId);
                    return `<tr>
                      <td style="font-weight:600;">${Helpers.escapeHtml(r.name)}</td>
                      <td>${cinema ? Helpers.escapeHtml(cinema.shortName) : r.cinemaId}</td>
                      <td><span class="badge badge-info">${r.type}</span></td>
                      <td>${r.capacity} ghế</td>
                      <td>${r.rows} × ${r.cols}</td>
                      <td><div class="table-actions">
                        <button class="action-btn edit" onclick="Toast.info('Chỉnh sửa phòng')" title="Sửa"><i class="fas fa-edit"></i></button>
                        <button class="action-btn delete" onclick="RoomController.handleDelete('${r.id}')" title="Xóa"><i class="fas fa-trash"></i></button>
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
  }
};
