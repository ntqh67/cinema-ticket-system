/**
 * Mục đích: Lớp View dựng giao diện và cập nhật DOM cho miền phòng chiếu.
 */
/* CineTicket - View phòng chiếu */
// Đối tượng RoomView đóng vai trò lớp hiển thị, dựng HTML và cập nhật DOM.
const RoomView = {
  _adminSelectedCinema: null,
  _adminCinemas: [],

  // Dựng phần giao diện tương ứng trong khối renderAdmin.
  async renderAdmin() {
    // Kiểm tra trạng thái đăng nhập hoặc vai trò trước khi cho phép thao tác.
    if (!AuthController.requireAdmin()) return;
    document.body.classList.add('admin-layout');
    const main = document.getElementById('main-content');
    // Dừng hoặc đổi hướng luồng khi dữ liệu bắt buộc chưa sẵn sàng.
    if (!main) return;

    let rooms = [];
    let cinemas = [];
    // Bắt đầu thao tác có thể thất bại để hiển thị phản hồi phù hợp cho người dùng.
    try {
      [rooms, cinemas] = await Promise.all([
        API.getAdminRooms(),
        API.getAdminCinemas(),
      ]);
    } catch (error) {
      Toast.error(error.message || 'Không thể tải phòng chiếu');
      rooms = RoomModel.getAll();
      cinemas = CinemaModel.getAll();
    }
    cinemas.sort((a, b) => String(a.code || '').localeCompare(String(b.code || ''), 'vi', { numeric: true }));
    this._adminCinemas = cinemas;
    // Kiểm tra trạng thái đăng nhập hoặc vai trò trước khi cho phép thao tác.
    if (!this._adminSelectedCinema || !cinemas.some((cinema) => cinema.id === this._adminSelectedCinema)) {
      this._adminSelectedCinema = cinemas[0]?.id || '';
    }
    const selectedCinema = cinemas.find((cinema) => cinema.id === this._adminSelectedCinema);
    const filteredRooms = this._adminSelectedCinema
      ? rooms.filter((room) => this._roomCinemaId(room) === this._adminSelectedCinema)
      : [];
    this._adminRooms = filteredRooms;

    main.innerHTML = `
    <div class="admin-layout-wrap">
      ${UserView._renderAdminSidebar('rooms')}
      <div class="admin-main">
        ${UserView._renderAdminTopbar('Quản Lý Phòng Chiếu', 'admin/rooms')}
        <div class="admin-content">
          <div class="admin-page-header">
            <div>
              <h1 class="admin-page-title">Phòng Chiếu</h1>
              <p class="admin-page-subtitle">${selectedCinema ? Helpers.escapeHtml(selectedCinema.name) : 'Chưa chọn rạp'} - ${filteredRooms.length} phòng</p>
            </div>
            <div class="admin-page-actions">
              <select class="form-control" style="width:260px;" onchange="RoomView.selectAdminCinema(this.value)">
                ${cinemas.map((cinema) => `<option value="${cinema.id}" ${cinema.id === this._adminSelectedCinema ? 'selected' : ''}>${Helpers.escapeHtml(cinema.code ? `${cinema.code} - ${cinema.name}` : cinema.name)}</option>`).join('')}
              </select>
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
                  ${filteredRooms.map((room) => this._roomRow(room)).join('') || '<tr><td colspan="7" class="admin-table-empty">Chưa có phòng chiếu cho rạp đang chọn</td></tr>'}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>`;
  },

  // Điều phối sự kiện và phản hồi người dùng trong khối selectAdminCinema.
  selectAdminCinema(cinemaId) {
    this._adminSelectedCinema = cinemaId;
    this.renderAdmin();
  },

  // Thực hiện trách nhiệm riêng của khối _roomCinemaId.
  _roomCinemaId(room) {
    return room.cinemaId || room.cinema?.id || '';
  },

  // Dựng phần giao diện tương ứng trong khối _roomRow.
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
          <button class="action-btn edit" onclick="RoomView.showEditForm('${room.id}')" title="Sửa"><i class="fas fa-edit"></i></button>
          <button class="action-btn delete" onclick="RoomController.handleDelete('${room.id}')" title="Xóa"><i class="fas fa-trash"></i></button>
        </div>
      </td>
    </tr>`;
  },

  // Dựng phần giao diện tương ứng trong khối showEditForm.
  showEditForm(roomId) {
    const room = (this._adminRooms || []).find((item) => item.id === roomId) || RoomModel.getById(roomId);
    // Dừng hoặc đổi hướng luồng khi dữ liệu bắt buộc chưa sẵn sàng.
    if (!room) {
      Toast.error('Không tìm thấy phòng chiếu');
      return;
    }
    const cinema = room.cinema || CinemaModel.getById(room.cinemaId);
    const content = `
      <form onsubmit="RoomView.saveEdit(event, '${room.id}')">
        <div class="form-group">
          <label class="form-label">Rạp chiếu</label>
          <input class="form-control" value="${Helpers.escapeHtml(cinema ? cinema.name : room.cinemaId || '')}" disabled />
        </div>
        <div class="form-group">
          <label class="form-label">Tên phòng *</label>
          <input class="form-control" id="edit-room-name" value="${Helpers.escapeHtml(room.name || '')}" required />
        </div>
        <div class="form-group">
          <label class="form-label">Sức chứa *</label>
          <input type="number" class="form-control" id="edit-room-capacity" min="1" value="${Number(room.capacity || room.seatCount || 1)}" required />
        </div>
        <p style="font-size:0.82rem;color:var(--color-text-muted);">Không thay đổi hàng/cột hoặc sơ đồ ghế trong bước này.</p>
        <div style="display:flex;gap:12px;justify-content:flex-end;margin-top:16px;">
          <button type="button" class="btn btn-secondary" onclick="Modal.close()">Hủy</button>
          <button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> Lưu thay đổi</button>
        </div>
      </form>`;
    Modal.show('Chỉnh Sửa Phòng Chiếu', content, { size: 'md' });
  },

  // Cập nhật trạng thái hoặc dữ liệu trong khối saveEdit.
  async saveEdit(event, roomId) {
    event.preventDefault();
    const payload = {
      name: document.getElementById('edit-room-name').value.trim(),
      capacity: Number(document.getElementById('edit-room-capacity').value),
    };
    // Dừng hoặc đổi hướng luồng khi dữ liệu bắt buộc chưa sẵn sàng.
    if (!payload.name || !payload.capacity) {
      Toast.error('Vui lòng nhập tên phòng và sức chứa hợp lệ');
      return;
    }
    try {
      await API.updateAdminRoom(roomId, payload);
      Modal.close();
      Toast.success('Đã cập nhật phòng chiếu');
      this.renderAdmin();
    } catch (error) {
      Toast.error(error.message || 'Không thể cập nhật phòng chiếu');
    }
  },
};
