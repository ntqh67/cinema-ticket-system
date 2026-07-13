/* CineTicket - Room View */
const RoomView = {
  _adminSelectedCinema: null,
  _adminCinemas: [],

  async renderAdmin() {
    if (!AuthController.requireAdmin()) return;
    document.body.classList.add('admin-layout');
    const main = document.getElementById('main-content');
    if (!main) return;

    let rooms = [];
    let cinemas = [];
    try {
      [rooms, cinemas] = await Promise.all([
        API.getAdminRooms(),
        API.getAdminCinemas(),
      ]);
    } catch (error) {
      Toast.error(error.message || 'KhÃ´ng thá»ƒ táº£i phÃ²ng chiáº¿u');
      rooms = RoomModel.getAll();
      cinemas = CinemaModel.getAll();
    }
    cinemas.sort((a, b) => String(a.code || '').localeCompare(String(b.code || ''), 'vi', { numeric: true }));
    this._adminCinemas = cinemas;
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
        ${UserView._renderAdminTopbar('Quáº£n LÃ½ PhÃ²ng Chiáº¿u', 'admin/rooms')}
        <div class="admin-content">
          <div class="admin-page-header">
            <div>
              <h1 class="admin-page-title">PhÃ²ng Chiáº¿u</h1>
              <p class="admin-page-subtitle">${selectedCinema ? Helpers.escapeHtml(selectedCinema.name) : 'ChÆ°a chá»n ráº¡p'} - ${filteredRooms.length} phÃ²ng</p>
            </div>
            <div class="admin-page-actions">
              <select class="form-control" style="width:260px;" onchange="RoomView.selectAdminCinema(this.value)">
                ${cinemas.map((cinema) => `<option value="${cinema.id}" ${cinema.id === this._adminSelectedCinema ? 'selected' : ''}>${Helpers.escapeHtml(cinema.code ? `${cinema.code} - ${cinema.name}` : cinema.name)}</option>`).join('')}
              </select>
              <button class="btn btn-primary" onclick="Toast.info('TÃ­nh nÄƒng thÃªm phÃ²ng Ä‘ang phÃ¡t triá»ƒn')">
                <i class="fas fa-plus"></i> ThÃªm PhÃ²ng
              </button>
            </div>
          </div>

          <div class="admin-table-card">
            <div class="admin-table-header">
              <span class="admin-table-title">Danh SÃ¡ch PhÃ²ng Chiáº¿u</span>
            </div>
            <div class="table-wrapper">
              <table class="admin-table">
                <thead>
                  <tr>
                    <th>TÃªn PhÃ²ng</th>
                    <th>Ráº¡p Chiáº¿u</th>
                    <th>Loáº¡i</th>
                    <th>Sá»©c Chá»©a</th>
                    <th>HÃ ng Ã— Cá»™t</th>
                    <th>Loáº¡i Gháº¿</th>
                    <th>HÃ nh Äá»™ng</th>
                  </tr>
                </thead>
                <tbody>
                  ${filteredRooms.map((room) => this._roomRow(room)).join('') || '<tr><td colspan="7" class="admin-table-empty">ChÆ°a cÃ³ phÃ²ng chiáº¿u cho ráº¡p Ä‘ang chá»n</td></tr>'}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>`;
  },

  selectAdminCinema(cinemaId) {
    this._adminSelectedCinema = cinemaId;
    this.renderAdmin();
  },

  _roomCinemaId(room) {
    return room.cinemaId || room.cinema?.id || '';
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
      <td>${Number(room.capacity || room.seatCount || 0)} gháº¿</td>
      <td>${rows} Ã— ${cols}</td>
      <td style="font-size:0.78rem;">
        ThÆ°á»ng: ${seatSummary.STANDARD || 0}<br>        ÄÃ´i: ${seatSummary.COUPLE || 0}
      </td>
      <td>
        <div class="table-actions">
          <button class="action-btn edit" onclick="RoomView.showEditForm('${room.id}')" title="Sá»­a"><i class="fas fa-edit"></i></button>
          <button class="action-btn delete" onclick="RoomController.handleDelete('${room.id}')" title="XÃ³a"><i class="fas fa-trash"></i></button>
        </div>
      </td>
    </tr>`;
  },

  showEditForm(roomId) {
    const room = (this._adminRooms || []).find((item) => item.id === roomId) || RoomModel.getById(roomId);
    if (!room) {
      Toast.error('KhÃ´ng tÃ¬m tháº¥y phÃ²ng chiáº¿u');
      return;
    }
    const cinema = room.cinema || CinemaModel.getById(room.cinemaId);
    const content = `
      <form onsubmit="RoomView.saveEdit(event, '${room.id}')">
        <div class="form-group">
          <label class="form-label">Ráº¡p chiáº¿u</label>
          <input class="form-control" value="${Helpers.escapeHtml(cinema ? cinema.name : room.cinemaId || '')}" disabled />
        </div>
        <div class="form-group">
          <label class="form-label">TÃªn phÃ²ng *</label>
          <input class="form-control" id="edit-room-name" value="${Helpers.escapeHtml(room.name || '')}" required />
        </div>
        <div class="form-group">
          <label class="form-label">Sá»©c chá»©a *</label>
          <input type="number" class="form-control" id="edit-room-capacity" min="1" value="${Number(room.capacity || room.seatCount || 1)}" required />
        </div>
        <p style="font-size:0.82rem;color:var(--color-text-muted);">KhÃ´ng thay Ä‘á»•i hÃ ng/cá»™t hoáº·c sÆ¡ Ä‘á»“ gháº¿ trong bÆ°á»›c nÃ y.</p>
        <div style="display:flex;gap:12px;justify-content:flex-end;margin-top:16px;">
          <button type="button" class="btn btn-secondary" onclick="Modal.close()">Há»§y</button>
          <button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> LÆ°u thay Ä‘á»•i</button>
        </div>
      </form>`;
    Modal.show('Chá»‰nh Sá»­a PhÃ²ng Chiáº¿u', content, { size: 'md' });
  },

  async saveEdit(event, roomId) {
    event.preventDefault();
    const payload = {
      name: document.getElementById('edit-room-name').value.trim(),
      capacity: Number(document.getElementById('edit-room-capacity').value),
    };
    if (!payload.name || !payload.capacity) {
      Toast.error('Vui lÃ²ng nháº­p tÃªn phÃ²ng vÃ  sá»©c chá»©a há»£p lá»‡');
      return;
    }
    try {
      await API.updateAdminRoom(roomId, payload);
      Modal.close();
      Toast.success('ÄÃ£ cáº­p nháº­t phÃ²ng chiáº¿u');
      this.renderAdmin();
    } catch (error) {
      Toast.error(error.message || 'KhÃ´ng thá»ƒ cáº­p nháº­t phÃ²ng chiáº¿u');
    }
  },
};
