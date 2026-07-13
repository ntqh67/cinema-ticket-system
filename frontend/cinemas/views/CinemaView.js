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
      <img src="${Helpers.escapeHtml(c.imageUrl || c.image || '')}" alt="${Helpers.escapeHtml(c.name)}" style="width:100%;height:180px;object-fit:cover;" onerror="this.src='https://picsum.photos/600/400?grayscale'" />
      <div class="card-body">
        <h4 style="margin-bottom:8px;">${Helpers.escapeHtml(c.name)}</h4>
        ${c.code ? `<div class="badge badge-secondary" style="margin-bottom:8px;">${Helpers.escapeHtml(c.code)}</div>` : ''}
        <p style="font-size:0.875rem;color:var(--color-text-muted);margin-bottom:12px;">
          <i class="fas fa-map-marker-alt" style="color:var(--color-primary);"></i> ${Helpers.escapeHtml([c.address, c.ward, c.city].filter(Boolean).join(', '))}
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

  async renderAdmin() {
    if (!AuthController.requireAdmin()) return;
    document.body.classList.add('admin-layout');
    let cinemas = [];
    try {
      cinemas = await API.getAdminCinemas();
    } catch (error) {
      Toast.error(error.message || 'Khong the tai danh sach rap');
      cinemas = CinemaModel.getAll();
    }
    cinemas.sort((a, b) => String(a.code || '').localeCompare(String(b.code || ''), 'vi', { numeric: true }));
    this._adminCinemas = cinemas;
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
              const rooms = c.rooms || API.mockData.rooms.filter(r => r.cinemaId === c.id);
              const prices = this._ticketPriceText(c.ticketPrices || []);
              return `
              <div class="card" style="cursor:pointer;" onclick="Router.navigate('/admin/cinemas/${c.id}')">
                <img src="${Helpers.escapeHtml(c.imageUrl || c.image || '')}" alt="${Helpers.escapeHtml(c.name)}" style="width:100%;height:160px;object-fit:cover;" onerror="this.src='https://picsum.photos/600/400?grayscale'" />
                <div class="card-body">
                  <h4 style="margin-bottom:6px;">${Helpers.escapeHtml(c.name)}</h4>
                  ${c.code ? `<div class="badge badge-secondary" style="margin-bottom:8px;">${Helpers.escapeHtml(c.code)}</div>` : ''}
                  <p style="font-size:0.8rem;color:var(--color-text-muted);margin-bottom:8px;">${Helpers.escapeHtml([c.address, c.ward, c.city].filter(Boolean).join(', '))}</p>
                  <p style="font-size:0.78rem;color:var(--color-primary);font-weight:700;margin-bottom:8px;">${prices}</p>
                  <div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap;">
                    ${(c.facilities || []).slice(0,3).map(f => `<span class="badge badge-secondary" style="font-size:0.65rem;">${Helpers.escapeHtml(f)}</span>`).join('')}
                  </div>
                  <div style="font-size:0.8rem;color:var(--color-text-muted);margin-bottom:12px;">
                    <i class="fas fa-door-open"></i> ${rooms.length} phòng &nbsp;|&nbsp; <i class="fas fa-phone"></i> ${c.phone}
                  </div>
                  <div class="table-actions">
                    <button class="action-btn edit" onclick="event.stopPropagation();CinemaView.showTicketPriceForm('${c.id}')" title="Gia Ve"><i class="fas fa-dollar-sign"></i></button>
                    <button class="action-btn edit" onclick="event.stopPropagation();CinemaView.showEditForm('${c.id}')" title="Sửa"><i class="fas fa-edit"></i></button>
                    <button class="action-btn delete" onclick="event.stopPropagation();CinemaController.handleDelete('${c.id}')" title="Xóa"><i class="fas fa-trash"></i></button>
                  </div>
                </div>
              </div>`;
            }).join('')}
          </div>
        </div>
      </div>
    </div>`;
  },

  async renderAdminDetail(params) {
    if (!AuthController.requireAdmin()) return;
    document.body.classList.add('admin-layout');
    const main = document.getElementById('main-content');
    if (!main) return;
    try {
      const [cinemas, rooms, showtimes] = await Promise.all([
        API.getAdminCinemas(), API.getAdminRooms(), API.getAdminShowtimes()
      ]);
      const cinema = cinemas.find((item) => item.id === params.id);
      if (!cinema) throw new Error('Không tìm thấy rạp');
      const cinemaRooms = rooms.filter((room) => room.cinemaId === cinema.id);
      const roomIds = new Set(cinemaRooms.map((room) => room.id));
      const cinemaShowtimes = showtimes
        .filter((showtime) => roomIds.has(showtime.roomId) && new Date(showtime.endAt) >= new Date())
        .sort((a, b) => new Date(a.startAt) - new Date(b.startAt));
      main.innerHTML = `
        <div class="admin-layout-wrap">
          ${UserView._renderAdminSidebar('cinemas')}
          <div class="admin-main">
            ${UserView._renderAdminTopbar('Chi Tiết Rạp Chiếu')}
            <div class="admin-content">
              <button class="btn btn-secondary" style="margin-bottom:20px;" onclick="Router.navigate('/admin/cinemas')"><i class="fas fa-arrow-left"></i> Danh sách rạp</button>
              <div class="admin-page-header"><div><h1 class="admin-page-title">${Helpers.escapeHtml(cinema.name)}</h1><p class="admin-page-subtitle">${cinemaRooms.length} phòng · ${cinemaShowtimes.length} suất sắp chiếu</p></div></div>
              <div class="grid grid-3" style="gap:16px;margin-bottom:24px;">
                ${cinemaRooms.map((room) => `<div class="card"><div class="card-body"><h4>${Helpers.escapeHtml(room.name)}</h4><p style="color:var(--color-text-muted);margin-top:8px;">${room.capacity} ghế</p></div></div>`).join('')}
              </div>
              <div class="admin-table-card"><div class="admin-table-header"><span class="admin-table-title">Phim và suất đang chiếu</span></div><div class="table-wrapper"><table class="admin-table"><thead><tr><th>Phim</th><th>Phòng</th><th>Bắt đầu</th><th>Kết thúc</th><th>Ghế đã đặt</th></tr></thead><tbody>
                ${cinemaShowtimes.slice(0, 100).map((showtime) => `<tr><td>${Helpers.escapeHtml(showtime.movie?.title || '')}</td><td>${Helpers.escapeHtml(showtime.room?.name || '')}</td><td>${new Date(showtime.startAt).toLocaleString('vi-VN')}</td><td>${new Date(showtime.endAt).toLocaleTimeString('vi-VN')}</td><td>${showtime.bookedSeats || 0}/${showtime.totalSeats || 0}</td></tr>`).join('') || '<tr><td colspan="5">Chưa có suất chiếu</td></tr>'}
              </tbody></table></div></div>
            </div>
          </div>
        </div>`;
    } catch (error) {
      Toast.error(error.message || 'Không thể tải chi tiết rạp');
      Router.navigate('/admin/cinemas');
    }
  },

  _ticketPriceText(ticketPrices) {
    const prices = Object.fromEntries(ticketPrices.map((item) => [item.seatType, Number(item.price)]));
    return [
      `Thuong ${Helpers.formatCurrency(prices.STANDARD || 0)}`,
      `VIP ${Helpers.formatCurrency(prices.VIP || 0)}`,
      `Doi ${Helpers.formatCurrency(prices.COUPLE || 0)}`,
    ].join(' | ');
  },

  async showTicketPriceForm(cinemaId) {
    let prices = [];
    try {
      prices = await API.getCinemaTicketPrices(cinemaId);
    } catch (error) {
      Toast.error(error.message || 'Khong the tai bang gia');
      return;
    }
    const byType = Object.fromEntries(prices.map((price) => [price.seatType, Number(price.price)]));
    const content = `
      <form id="cinema-ticket-price-form" onsubmit="CinemaView.saveTicketPrices(event, '${cinemaId}')">
        <div class="form-group">
          <label class="form-label">Ghe Thuong (VND)</label>
          <input class="form-control" id="price-standard" type="number" min="0" step="1000" value="${byType.STANDARD || 0}" required />
        </div>
        <div class="form-group">
          <label class="form-label">Ghe VIP (VND)</label>
          <input class="form-control" id="price-vip" type="number" min="0" step="1000" value="${byType.VIP || 0}" required />
        </div>
        <div class="form-group">
          <label class="form-label">Ghe Doi (VND)</label>
          <input class="form-control" id="price-couple" type="number" min="0" step="1000" value="${byType.COUPLE || 0}" required />
        </div>
        <p style="font-size:0.82rem;color:var(--color-text-muted);">Gia nay ap dung cho cac suat chieu moi tao sau khi luu.</p>
        <button type="submit" class="btn btn-primary btn-block">Luu Bang Gia</button>
      </form>`;
    Modal.show('Bang Gia Ve Theo Rap', content, { size: 'md' });
  },

  async saveTicketPrices(event, cinemaId) {
    event.preventDefault();
    const payloads = [
      { seatType: 'STANDARD', price: Number(document.getElementById('price-standard').value), isActive: true },
      { seatType: 'VIP', price: Number(document.getElementById('price-vip').value), isActive: true },
      { seatType: 'COUPLE', price: Number(document.getElementById('price-couple').value), isActive: true },
    ];
    try {
      await Promise.all(payloads.map((payload) => API.upsertCinemaTicketPrice(cinemaId, payload)));
      Modal.close();
      Toast.success('Da cap nhat bang gia ve');
      this.renderAdmin();
    } catch (error) {
      Toast.error(error.message || 'Khong the luu bang gia');
    }
  },

  showEditForm(cinemaId) {
    const cinema = (this._adminCinemas || []).find((item) => item.id === cinemaId) || CinemaModel.getById(cinemaId);
    if (!cinema) {
      Toast.error('Không tìm thấy rạp chiếu');
      return;
    }
    const content = `
      <form onsubmit="CinemaView.saveEdit(event, '${cinema.id}')">
        <div class="admin-form-grid">
          <div class="form-group">
            <label class="form-label">Mã chi nhánh</label>
            <input class="form-control" id="edit-cinema-code" value="${Helpers.escapeHtml(cinema.code || '')}" placeholder="CR01" />
          </div>
          <div class="form-group">
            <label class="form-label">Tên chi nhánh *</label>
            <input class="form-control" id="edit-cinema-name" value="${Helpers.escapeHtml(cinema.name || '')}" required />
          </div>
          <div class="form-group form-full">
            <label class="form-label">Địa chỉ</label>
            <input class="form-control" id="edit-cinema-address" value="${Helpers.escapeHtml(cinema.address || '')}" />
          </div>
          <div class="form-group">
            <label class="form-label">Phường/Quận</label>
            <input class="form-control" id="edit-cinema-ward" value="${Helpers.escapeHtml(cinema.ward || '')}" />
          </div>
          <div class="form-group">
            <label class="form-label">Thành phố</label>
            <input class="form-control" id="edit-cinema-city" value="${Helpers.escapeHtml(cinema.city || 'Đà Nẵng')}" />
          </div>
          <div class="form-group">
            <label class="form-label">Số điện thoại</label>
            <input class="form-control" id="edit-cinema-phone" value="${Helpers.escapeHtml(cinema.phone || '')}" />
          </div>
          <div class="form-group">
            <label class="form-label">Email</label>
            <input type="email" class="form-control" id="edit-cinema-email" value="${Helpers.escapeHtml(cinema.email || '')}" />
          </div>
          <div class="form-group form-full">
            <label class="form-label">Ảnh rạp</label>
            <input class="form-control" id="edit-cinema-image-url" value="${Helpers.escapeHtml(cinema.imageUrl || cinema.image || '')}" placeholder="/assets/images/cinemas/cr01-riverside.jpg" />
          </div>
        </div>
        <div style="display:flex;gap:12px;justify-content:flex-end;margin-top:16px;">
          <button type="button" class="btn btn-secondary" onclick="Modal.close()">Hủy</button>
          <button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> Lưu thay đổi</button>
        </div>
      </form>`;
    Modal.show('Chỉnh Sửa Rạp Chiếu', content, { size: 'lg' });
  },

  async saveEdit(event, cinemaId) {
    event.preventDefault();
    const email = document.getElementById('edit-cinema-email').value.trim();
    const payload = {
      code: document.getElementById('edit-cinema-code').value.trim() || null,
      name: document.getElementById('edit-cinema-name').value.trim(),
      address: document.getElementById('edit-cinema-address').value.trim() || null,
      ward: document.getElementById('edit-cinema-ward').value.trim() || null,
      city: document.getElementById('edit-cinema-city').value.trim() || 'Đà Nẵng',
      phone: document.getElementById('edit-cinema-phone').value.trim() || null,
      email: email || null,
      imageUrl: document.getElementById('edit-cinema-image-url').value.trim() || null,
    };
    if (!payload.name) {
      Toast.error('Vui lòng nhập tên rạp');
      return;
    }
    try {
      await API.updateAdminCinema(cinemaId, payload);
      Modal.close();
      Toast.success('Đã cập nhật rạp chiếu');
      this.renderAdmin();
    } catch (error) {
      Toast.error(error.message || 'Không thể cập nhật rạp chiếu');
    }
  }
};
