/* CineTicket - Concession View */
const ConcessionView = {
  _combos: [],
  _selectedCombos: {},

  async renderCheckout() {
    if (!AuthController.checkAuth()) return;
    const booking = State.get('currentBooking');
    if (!booking || !booking.backendBookingId) {
      Toast.warning('Không có thông tin đặt vé');
      Router.navigate('/');
      return;
    }

    document.body.classList.remove('admin-layout');
    document.getElementById('footer').style.display = '';
    const main = document.getElementById('main-content');
    if (!main) return;

    this._selectedCombos = {};
    try {
      this._combos = await API.getConcessionCombos();
    } catch (error) {
      Toast.error(error.message || 'Không thể tải combo bắp nước');
      this._combos = [];
    }

    main.innerHTML = `
    <div class="payment-page">
      <div class="container">
        <div class="booking-steps" style="max-width:680px;margin:0 auto 40px;">
          <div class="booking-step done"><div class="booking-step-num"><i class="fas fa-check"></i></div><span class="booking-step-label">Chọn phim</span></div>
          <div class="booking-step-divider done"></div>
          <div class="booking-step done"><div class="booking-step-num"><i class="fas fa-check"></i></div><span class="booking-step-label">Chọn ghế</span></div>
          <div class="booking-step-divider"></div>
          <div class="booking-step active"><div class="booking-step-num">3</div><span class="booking-step-label">Bắp nước</span></div>
          <div class="booking-step-divider"></div>
          <div class="booking-step"><div class="booking-step-num">4</div><span class="booking-step-label">Thanh toán</span></div>
        </div>

        <div class="payment-layout">
          <div class="booking-card">
            <div class="booking-card-header">
              <div class="booking-card-title"><span class="step-badge">3</span> Chọn Combo Bắp Nước</div>
            </div>
            <div class="booking-card-body">
              ${this._checkoutComboList()}
              <div style="display:flex;gap:12px;justify-content:flex-end;margin-top:24px;">
                <button class="btn btn-outline" onclick="ConcessionView.skipCheckout()">Bỏ qua</button>
                <button class="btn btn-primary" onclick="ConcessionView.continueToPayment()"><i class="fas fa-arrow-right"></i> Tiếp tục thanh toán</button>
              </div>
            </div>
          </div>

          <div class="order-panel">
            <div class="order-panel-header"><i class="fas fa-receipt"></i> Tóm tắt đơn hàng</div>
            <div class="order-panel-body">
              <div class="order-line">
                <span class="order-line-label">Tiền ghế</span>
                <span class="order-line-value">${Helpers.formatCurrency(booking.seatSubtotal || booking.totalPrice || 0)}</span>
              </div>
              <div id="concession-combo-summary"></div>
              <div class="order-final">
                <span>Tổng cộng</span>
                <span class="order-final-amount" id="concession-total">${Helpers.formatCurrency(booking.totalPrice || 0)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>`;

    this._renderCheckoutSummary();
  },

  _checkoutComboList() {
    if (!this._combos.length) {
      return '<div class="empty-state" style="padding:32px 0;"><i class="fas fa-shopping-basket"></i><h3>Chưa có combo đang bán</h3><p>Bạn có thể bỏ qua bước này.</p></div>';
    }

    return `
      <div class="grid grid-2" style="gap:16px;">
        ${this._combos.map((combo) => `
          <div class="card">
            <div class="card-body" style="display:flex;gap:14px;align-items:center;">
              <img src="${Helpers.escapeHtml(combo.imageUrl || API.moviePosterFallback)}" alt="" style="width:82px;height:82px;object-fit:cover;border-radius:8px;" onerror="this.src=API.moviePosterFallback" />
              <div style="flex:1;min-width:0;">
                <h4 style="margin-bottom:4px;">${Helpers.escapeHtml(combo.name)}</h4>
                <p style="font-size:0.84rem;color:var(--color-text-muted);margin-bottom:8px;">${Helpers.escapeHtml(combo.description || '')}</p>
                <div style="font-weight:800;color:var(--color-primary);">${Helpers.formatCurrency(Number(combo.price))}</div>
              </div>
              <div style="display:flex;align-items:center;gap:8px;">
                <button type="button" class="action-btn" onclick="ConcessionView.changeQuantity('${combo.id}', -1)">-</button>
                <span id="checkout-combo-qty-${combo.id}" style="min-width:24px;text-align:center;font-weight:800;">0</span>
                <button type="button" class="action-btn edit" onclick="ConcessionView.changeQuantity('${combo.id}', 1)">+</button>
              </div>
            </div>
          </div>
        `).join('')}
      </div>`;
  },

  changeQuantity(comboId, delta) {
    const next = Math.max(0, Math.min(10, (this._selectedCombos[comboId] || 0) + delta));
    if (next === 0) delete this._selectedCombos[comboId];
    else this._selectedCombos[comboId] = next;
    const el = document.getElementById(`checkout-combo-qty-${comboId}`);
    if (el) el.textContent = String(next);
    this._renderCheckoutSummary();
  },

  _selectedItems() {
    return Object.entries(this._selectedCombos).map(([comboId, quantity]) => ({ comboId, quantity }));
  },

  _comboSubtotal() {
    return this._combos.reduce((sum, combo) => sum + Number(combo.price || 0) * (this._selectedCombos[combo.id] || 0), 0);
  },

  _renderCheckoutSummary() {
    const booking = State.get('currentBooking');
    if (!booking) return;
    const summary = document.getElementById('concession-combo-summary');
    const total = document.getElementById('concession-total');
    const selected = this._combos.filter((combo) => this._selectedCombos[combo.id]);
    if (summary) {
      summary.innerHTML = selected.map((combo) => `
        <div class="order-row">
          <span class="order-row-label">${Helpers.escapeHtml(combo.name)} x${this._selectedCombos[combo.id]}</span>
          <span class="order-row-value">${Helpers.formatCurrency(Number(combo.price) * this._selectedCombos[combo.id])}</span>
        </div>
      `).join('');
    }
    if (total) total.textContent = Helpers.formatCurrency((booking.seatSubtotal || booking.totalPrice || 0) + this._comboSubtotal());
  },

  async skipCheckout() {
    await this._saveCombosAndContinue([]);
  },

  async continueToPayment() {
    await this._saveCombosAndContinue(this._selectedItems());
  },

  async _saveCombosAndContinue(items) {
    const booking = State.get('currentBooking');
    if (!booking || !booking.backendBookingId) {
      Toast.error('Phiên đặt vé không hợp lệ');
      Router.navigate('/');
      return;
    }

    try {
      const result = await API.updateBookingCombos(booking.backendBookingId, items);
      State.set('currentBooking', {
        ...booking,
        totalPrice: result.totalAmount,
        seatSubtotal: result.seatSubtotal,
        comboSubtotal: result.comboSubtotal,
        comboItems: result.comboItems || [],
      });
      Router.navigate('/payment');
    } catch (error) {
      Toast.error(error.message || 'Không thể cập nhật combo');
    }
  },

  async renderAdmin() {
    if (!AuthController.requireAdmin()) return;
    document.body.classList.add('admin-layout');
    const main = document.getElementById('main-content');
    if (!main) return;

    let combos = [];
    try {
      combos = await API.getAdminConcessionCombos();
    } catch (error) {
      Toast.error(error.message || 'Khong the tai combo');
    }
    this._combos = combos;

    main.innerHTML = `
    <div class="admin-layout-wrap">
      ${UserView._renderAdminSidebar('concessions')}
      <div class="admin-main">
        ${UserView._renderAdminTopbar('Quản Lý Combo Bắp Nước', 'admin/concessions')}
        <div class="admin-content">
          <div class="admin-page-header">
            <div>
              <h1 class="admin-page-title">Combo Bắp Nước</h1>
              <p class="admin-page-subtitle">${combos.length} combo trong he thong</p>
            </div>
            <button class="btn btn-primary" onclick="ConcessionView.showForm()"><i class="fas fa-plus"></i> Thêm Combo</button>
          </div>
          <div class="data-table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Combo</th>
                  <th>Mô Tả</th>
                  <th>Giá</th>
                  <th>Trạng Thái</th>
                  <th>Thao Tác</th>
                </tr>
              </thead>
              <tbody>
                ${combos.map((combo) => this._row(combo)).join('') || '<tr><td colspan="5" class="empty-cell">Chưa có combo</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>`;
  },

  _row(combo) {
    return `
      <tr>
        <td>
          <div style="display:flex;align-items:center;gap:10px;">
            <img src="${Helpers.escapeHtml(combo.imageUrl || API.moviePosterFallback)}" alt="" style="width:48px;height:48px;object-fit:cover;border-radius:6px;" onerror="this.src=API.moviePosterFallback" />
            <strong>${Helpers.escapeHtml(combo.name)}</strong>
          </div>
        </td>
        <td>${Helpers.escapeHtml(combo.description || '')}</td>
        <td>${Helpers.formatCurrency(Number(combo.price))}</td>
        <td><span class="badge ${combo.isActive ? 'badge-success' : 'badge-secondary'}">${combo.isActive ? 'Đang bán' : 'Đã ẩn'}</span></td>
        <td>
          <div class="table-actions">
            <button class="action-btn edit" onclick="ConcessionView.showFormById('${combo.id}')"><i class="fas fa-edit"></i></button>
            <button class="action-btn delete" onclick="ConcessionController.handleDelete('${combo.id}')"><i class="fas fa-trash"></i></button>
          </div>
        </td>
      </tr>`;
  },

  showFormById(comboId) {
    const combo = this._combos.find((item) => item.id === comboId);
    this.showForm(combo || null);
  },

  showForm(combo = null) {
    const isEdit = Boolean(combo);
    const content = `
      <form id="combo-form" onsubmit="ConcessionController.handleSave(event, ${isEdit ? `'${combo.id}'` : 'null'})">
        <div class="form-group">
          <label class="form-label">Tên Combo</label>
          <input class="form-control" id="combo-name" value="${Helpers.escapeHtml(combo?.name || '')}" required />
        </div>
        <div class="form-group">
          <label class="form-label">Mô Tả</label>
          <textarea class="form-control" id="combo-description" rows="3">${Helpers.escapeHtml(combo?.description || '')}</textarea>
        </div>
        <div class="form-group">
          <label class="form-label">Giá (VND)</label>
          <input class="form-control" id="combo-price" type="number" min="0" step="1000" value="${Number(combo?.price || 0)}" required />
        </div>
        <div class="form-group">
          <label class="form-label">Ảnh Combo</label>
          <input class="form-control" id="combo-image" value="${Helpers.escapeHtml(combo?.imageUrl || '')}" />
        </div>
        <label style="display:flex;align-items:center;gap:8px;">
          <input type="checkbox" id="combo-active" ${combo?.isActive === false ? '' : 'checked'} />
          Đang bán
        </label>
        <button type="submit" class="btn btn-primary btn-block" style="margin-top:18px;">Lưu Combo</button>
      </form>`;
    Modal.show(isEdit ? 'Sửa Combo' : 'Thêm Combo', content, { size: 'md' });
  },
};
