/* CineTicket - Room View */
const RoomView = {
  async renderAdmin() {
    if (!AuthController.requireAdmin()) return;
    document.body.classList.add('admin-layout');
    const main = document.getElementById('main-content');
    if (!main) return;

    let rooms = [];
    try {
      rooms = await API.getAdminRooms();
    } catch (error) {
      Toast.error(error.message || 'Không thể tải phòng chiếu');
      rooms = RoomModel.getAll();
    }

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
              <button class="btn btn-primary" onclick="Toast.info('Tính năng thêm phòng đang phát triển')">
                <i class="fas fa-plus"></i> Thêm Phòng
              </button>
            </div>
          </div>

          <div class="admin-table-card">
            <div class="admin-table-header">
              <span class="admin-table-title">Danh Sách Phòng Chiếu</span>
            </div>
            <div class="table-wrapper">
              <table class="admin-table">
                <thead>
                  <tr>
                    <th>Tên Phòng</th>
                    <th>Rạp Chiếu</th>
                    <th>Loại</th>
                    <th>Sức Chứa</th>
                    <th>Hàng × Cột</th>
                    <th>Loại Ghế</th>
                    <th>Hành Động</th>
                  </tr>
                </thead>
                <tbody>
                  ${rooms.map((room) => this._roomRow(room)).join('') || '<tr><td colspan="7" class="admin-table-empty">Chưa có phòng chiếu</td></tr>'}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>`;
  },

  _roomRow(room) {
    const cinema = room.cinema || CinemaModel.getById(room.cinemaId);
    const seatSummary = room.seatTypeSummary || {};
    const rows = Number(room.rows || 0);
    const cols = Number(room.cols || 0);

    return `<tr>
      <td style="font-weight:600;">${Helpers.escapeHtml(room.name)}</td>
      <td>${cinema ? Helpers.escapeHtml(cinema.name || cinema.shortName) : Helpers.escapeHtml(room.cinemaId || '')}</td>
      <td><span class="badge badge-info">${Helpers.escapeHtml(room.type || '2D')}</span></td>
      <td>${Number(room.capacity || room.seatCount || 0)} ghế</td>
      <td>${rows} × ${cols}</td>
      <td style="font-size:0.78rem;">
        Thường: ${seatSummary.STANDARD || 0}<br>
        VIP: ${seatSummary.VIP || 0}<br>
        Đôi: ${seatSummary.COUPLE || 0}
      </td>
      <td>
        <div class="table-actions">
          <button class="action-btn edit" onclick="Toast.info('Chỉnh sửa phòng')" title="Sửa"><i class="fas fa-edit"></i></button>
          <button class="action-btn delete" onclick="RoomController.handleDelete('${room.id}')" title="Xóa"><i class="fas fa-trash"></i></button>
        </div>
      </td>
    </tr>`;
  },
};
