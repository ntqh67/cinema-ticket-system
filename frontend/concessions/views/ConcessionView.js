/**
 * Mục đích: Lớp View dựng giao diện và cập nhật DOM cho miền combo bắp nước.
 */
/* CineTicket - View combo bắp nước */
// Đối tượng ConcessionView đóng vai trò lớp hiển thị, dựng HTML và cập nhật DOM.
const ConcessionView = {
  _combos: [],
  _selectedCombos: {},

  // Kiểm tra điều kiện nghiệp vụ trong khối renderCheckout trước khi tiếp tục.
  async renderCheckout() {
    // Kiểm tra trạng thái đăng nhập hoặc vai trò trước khi cho phép thao tác.
    if (!AuthController.checkAuth()) return;
    const booking = State.get('currentBooking');
    // Kiểm tra trạng thái booking hoặc thanh toán để chọn bước giao diện tiếp theo.
    if (!booking || !booking.backendBookingId) {
      Toast.warning('Không có thông tin đặt vé');
      Router.navigate('/');
      return;
    }

    document.body.classList.remove('admin-layout');
    document.getElementById('footer').style.display = '';
    const main = document.getElementById('main-content');
    // Dừng hoặc đổi hướng luồng khi dữ liệu bắt buộc chưa sẵn sàng.
    if (!main) return;

    this._selectedCombos = {};
    // Bắt đầu thao tác có thể thất bại để hiển thị phản hồi phù hợp cho người dùng.
    try {
      this._combos = await API.getConcessionCombos();
    } catch (error) {
      Toast.error(error.message || 'Không thể tải combo bắp nước');
      this._combos = [];
    }

    main.innerHTML = `
    <div class="payment-page concession-page">
      <div class="container">
        <div class="booking-steps concession-steps">
          <div class="booking-step done"><div class="booking-step-num"><i class="fas fa-check"></i></div><span class="booking-step-label">Chọn phim</span></div>
          <div class="booking-step-divider done"></div>
          <div class="booking-step done"><div class="booking-step-num"><i class="fas fa-check"></i></div><span class="booking-step-label">Chọn ghế</span></div>
          <div class="booking-step-divider"></div>
          <div class="booking-step active"><div class="booking-step-num">3</div><span class="booking-step-label">Bắp nước</span></div>
          <div class="booking-step-divider"></div>
          <div class="booking-step"><div class="booking-step-num">4</div><span class="booking-step-label">Thanh toán</span></div>
        </div>

        <div class="concession-layout">
          <div class="concession-catalog">
            <div class="concession-hero">
              <div>
                <span class="concession-kicker">Bước 3</span>
                <h2>Chọn combo bắp nước</h2>
                <p>Thêm món ăn nhẹ cho buổi xem phim, hoặc bỏ qua nếu bạn chỉ muốn thanh toán vé.</p>
              </div>
              <div class="concession-hero-icon"><i class="fas fa-shopping-basket"></i></div>
            </div>
            ${this._checkoutComboList()}
          </div>

          <div class="order-panel concession-summary-panel">
            <div class="order-panel-header"><i class="fas fa-receipt"></i> Tóm tắt đơn hàng</div>
            <div class="order-panel-body">
              <div class="order-line">
                <span class="order-line-label">Tiền ghế</span>
                <span class="order-line-value">${Helpers.formatCurrency(booking.seatSubtotal ?? booking.totalPrice ?? 0)}</span>
              </div>
              <div class="order-line">
                <span class="order-line-label">Tiền combo</span>
                <span class="order-line-value" id="concession-subtotal">${Helpers.formatCurrency(0)}</span>
              </div>
              <div id="concession-combo-summary"></div>
              <div class="order-final">
                <span>Tổng cộng</span>
                <span class="order-final-amount" id="concession-total">${Helpers.formatCurrency(booking.totalPrice ?? 0)}</span>
              </div>
              <div class="concession-actions">
                <button class="btn btn-outline btn-block" onclick="ConcessionView.skipCheckout()">Bỏ qua</button>
                <button class="btn btn-primary btn-block" onclick="ConcessionView.continueToPayment()"><i class="fas fa-arrow-right"></i> Tiếp tục thanh toán</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>`;

    this._renderCheckoutSummary();
  },

  // Kiểm tra điều kiện nghiệp vụ trong khối _checkoutComboList trước khi tiếp tục.
  _checkoutComboList() {
    // Xử lý riêng trường hợp danh sách rỗng hoặc có số lượng không hợp lệ.
    if (!this._combos.length) {
      return '<div class="empty-state concession-empty"><i class="fas fa-shopping-basket"></i><h3>Chưa có combo đang bán</h3><p>Bạn có thể bỏ qua bước này.</p></div>';
    }

    return `
      <div class="concession-grid">
        ${this._combos.map((combo) => `
          <div class="concession-card" id="checkout-combo-card-${combo.id}">
            <img class="concession-card-image" src="${Helpers.escapeHtml(combo.imageUrl || API.moviePosterFallback)}" alt="${Helpers.escapeHtml(combo.name)}" onerror="this.src=API.moviePosterFallback" />
            <div class="concession-card-body">
              <div>
                <h4>${Helpers.escapeHtml(combo.name)}</h4>
                <p>${Helpers.escapeHtml(combo.description || 'Combo bắp nước cho buổi xem phim của bạn.')}</p>
              </div>
              <div class="concession-card-footer">
                <div class="concession-price">${Helpers.formatCurrency(Number(combo.price))}</div>
                <div class="concession-stepper">
                  <button type="button" onclick="ConcessionView.changeQuantity('${combo.id}', -1)" aria-label="Giảm số lượng">-</button>
                  <span id="checkout-combo-qty-${combo.id}">0</span>
                  <button type="button" onclick="ConcessionView.changeQuantity('${combo.id}', 1)" aria-label="Tăng số lượng">+</button>
                </div>
              </div>
            </div>
          </div>
        `).join('')}
      </div>`;
  },

  // Thực hiện trách nhiệm riêng của khối changeQuantity.
  changeQuantity(comboId, delta) {
    const next = Math.max(0, Math.min(10, (this._selectedCombos[comboId] || 0) + delta));
    // Đánh giá điều kiện hiện tại để cập nhật giao diện và trạng thái đúng nhánh.
    if (next === 0) delete this._selectedCombos[comboId];
    else this._selectedCombos[comboId] = next;
    const el = document.getElementById(`checkout-combo-qty-${comboId}`);
    // Đánh giá điều kiện hiện tại để cập nhật giao diện và trạng thái đúng nhánh.
    if (el) el.textContent = String(next);
    const card = document.getElementById(`checkout-combo-card-${comboId}`);
    // Đánh giá điều kiện hiện tại để cập nhật giao diện và trạng thái đúng nhánh.
    if (card) card.classList.toggle('selected', next > 0);
    this._renderCheckoutSummary();
  },

  // Điều phối sự kiện và phản hồi người dùng trong khối _selectedItems.
  _selectedItems() {
    return Object.entries(this._selectedCombos).map(([comboId, quantity]) => ({ comboId, quantity }));
  },

  // Tính toán giá trị tổng hợp trong khối _comboSubtotal.
  _comboSubtotal() {
    return this._combos.reduce((sum, combo) => sum + Number(combo.price || 0) * (this._selectedCombos[combo.id] || 0), 0);
  },

  // Kiểm tra điều kiện nghiệp vụ trong khối _renderCheckoutSummary trước khi tiếp tục.
  _renderCheckoutSummary() {
    const booking = State.get('currentBooking');
    // Kiểm tra trạng thái booking hoặc thanh toán để chọn bước giao diện tiếp theo.
    if (!booking) return;
    const summary = document.getElementById('concession-combo-summary');
    const subtotal = document.getElementById('concession-subtotal');
    const total = document.getElementById('concession-total');
    const selected = this._combos.filter((combo) => this._selectedCombos[combo.id]);
    const comboSubtotal = this._comboSubtotal();
    // Đánh giá điều kiện hiện tại để cập nhật giao diện và trạng thái đúng nhánh.
    if (summary) {
      summary.innerHTML = selected.length
        ? `<div class="concession-summary-list">${selected.map((combo) => `
            <div class="order-line concession-summary-item">
              <span class="order-line-label">${Helpers.escapeHtml(combo.name)} x${this._selectedCombos[combo.id]}</span>
              <span class="order-line-value">${Helpers.formatCurrency(Number(combo.price) * this._selectedCombos[combo.id])}</span>
            </div>
          `).join('')}</div>`
        : '<div class="concession-summary-empty">Chưa chọn combo nào</div>';
    }
    // Đánh giá điều kiện hiện tại để cập nhật giao diện và trạng thái đúng nhánh.
    if (subtotal) subtotal.textContent = Helpers.formatCurrency(comboSubtotal);
    // Kiểm tra trạng thái ghế và lượt giữ ghế trước khi cập nhật lựa chọn.
    if (total) total.textContent = Helpers.formatCurrency((booking.seatSubtotal ?? booking.totalPrice ?? 0) + comboSubtotal);
  },

  // Kiểm tra điều kiện nghiệp vụ trong khối skipCheckout trước khi tiếp tục.
  async skipCheckout() {
    await this._saveCombosAndContinue([]);
  },

  // Thực hiện bước thanh toán trong khối continueToPayment với kiểm tra trạng thái an toàn.
  async continueToPayment() {
    await this._saveCombosAndContinue(this._selectedItems());
  },

  // Cập nhật trạng thái hoặc dữ liệu trong khối _saveCombosAndContinue.
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

  // Dựng phần giao diện tương ứng trong khối renderAdmin.
  async renderAdmin() {
    // Kiểm tra trạng thái đăng nhập hoặc vai trò trước khi cho phép thao tác.
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
              <p class="admin-page-subtitle">${combos.filter(combo => combo.isActive).length} đang bán · ${combos.length} combo trong hệ thống</p>
            </div>
            <button class="btn btn-primary" onclick="ConcessionView.showForm()"><i class="fas fa-plus"></i> Thêm Combo</button>
          </div>
          <section class="admin-combo-toolbar">
            <div><i class="fas fa-ticket-alt"></i><span>Danh sách combo được trình bày giống thẻ vé phim</span></div>
            <div class="admin-combo-toolbar-count"><b>${combos.filter(combo => combo.isActive).length}</b> đang bán</div>
          </section>
          <div class="admin-combo-grid">
            ${combos.map((combo) => this._adminCard(combo)).join('') || '<div class="admin-table-empty">Chưa có combo</div>'}
          </div>
        </div>
      </div>
    </div>`;
  },

  _adminCard(combo) {
    return `
      <article class="admin-combo-card ${combo.isActive ? '' : 'is-hidden'}">
        <div class="admin-combo-poster-wrap">
          <img class="admin-combo-poster" src="${Helpers.escapeHtml(combo.imageUrl || API.moviePosterFallback)}" alt="${Helpers.escapeHtml(combo.name)}" onerror="this.src=API.moviePosterFallback" />
          <span class="admin-combo-status ${combo.isActive ? 'active' : 'hidden'}">${combo.isActive ? 'Đang bán' : 'Đã ẩn'}</span>
          <span class="admin-combo-ticket-mark"><i class="fas fa-ticket-alt"></i></span>
        </div>
        <div class="admin-combo-card-body">
          <div>
            <h3>${Helpers.escapeHtml(combo.name)}</h3>
            <p>${Helpers.escapeHtml(combo.description || 'Combo bắp nước dành cho buổi xem phim.')}</p>
          </div>
          <div class="admin-combo-price"><small>Giá combo</small><strong>${Helpers.formatCurrency(Number(combo.price))}</strong></div>
          <div class="admin-combo-actions">
            <button class="btn btn-outline btn-sm" onclick="ConcessionView.showDetailById('${combo.id}')" title="Xem combo"><i class="fas fa-eye"></i></button>
            <button class="btn btn-primary btn-sm" onclick="ConcessionView.showFormById('${combo.id}')"><i class="fas fa-edit"></i> Chỉnh Sửa</button>
            <button class="btn btn-outline btn-sm" onclick="ConcessionController.handleDelete('${combo.id}')" title="Ẩn combo" ${combo.isActive ? '' : 'disabled'}><i class="fas fa-trash"></i></button>
          </div>
        </div>
      </article>`;
  },

  showDetailById(comboId) {
    const combo = this._combos.find(item => item.id === comboId);
    if (!combo) return;
    Modal.show('Chi Tiết Combo', `<div class="admin-combo-detail"><img src="${Helpers.escapeHtml(combo.imageUrl || API.moviePosterFallback)}" onerror="this.src=API.moviePosterFallback" alt="${Helpers.escapeHtml(combo.name)}"><div><span class="badge ${combo.isActive ? 'badge-success' : 'badge-secondary'}">${combo.isActive ? 'Đang bán' : 'Đã ẩn'}</span><h2>${Helpers.escapeHtml(combo.name)}</h2><p>${Helpers.escapeHtml(combo.description || '')}</p><small>Giá bán</small><strong>${Helpers.formatCurrency(Number(combo.price))}</strong><button class="btn btn-primary" onclick="Modal.close();ConcessionView.showFormById('${combo.id}')"><i class="fas fa-edit"></i> Chỉnh Sửa Combo</button></div></div>`, { size: 'lg' });
  },

  // Dựng phần giao diện tương ứng trong khối showFormById.
  showFormById(comboId) {
    const combo = this._combos.find((item) => item.id === comboId);
    this.showForm(combo || null);
  },

  // Dựng phần giao diện tương ứng trong khối showForm.
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
          <input type="hidden" id="combo-image" value="${Helpers.escapeHtml(combo?.imageUrl || '')}" />
          <div class="combo-image-upload">
            <img id="combo-image-preview" src="${Helpers.escapeHtml(combo?.imageUrl || API.moviePosterFallback)}" onerror="this.src=API.moviePosterFallback" alt="Xem trước ảnh combo" />
            <div class="combo-image-upload-actions">
              <label class="btn btn-primary btn-sm" for="combo-image-file"><i class="fas fa-upload"></i> Tải Ảnh Từ Máy</label>
              <input id="combo-image-file" type="file" accept="image/jpeg,image/png,image/webp" onchange="ConcessionView.handleComboImageFile(this)" />
              <small>JPG, PNG hoặc WebP · tối đa 2 MB</small>
              <select class="form-control" onchange="if(this.value) ConcessionView.setComboImage(this.value)">
                <option value="">Hoặc chọn ảnh có sẵn</option>
                <option value="/assets/images/combos/my_combo.jpg">My Combo</option>
                <option value="/assets/images/combos/double_combo.jpg">Double Combo</option>
                <option value="/assets/images/combos/hattrick_combo.jpg">Hattrick Combo</option>
                <option value="/assets/images/combos/poker_combo.jpg">Poker Combo</option>
              </select>
            </div>
          </div>
        </div>
        <label style="display:flex;align-items:center;gap:8px;">
          <input type="checkbox" id="combo-active" ${combo?.isActive === false ? '' : 'checked'} />
          Đang bán
        </label>
        <button type="submit" class="btn btn-primary btn-block" style="margin-top:18px;">Lưu Combo</button>
      </form>`;
    Modal.show(isEdit ? 'Sửa Combo' : 'Thêm Combo', content, { size: 'md' });
  },

  setComboImage(value) {
    const field = document.getElementById('combo-image');
    const preview = document.getElementById('combo-image-preview');
    if (field) field.value = value || '';
    if (preview) preview.src = value || API.moviePosterFallback;
  },

  handleComboImageFile(input) {
    const file = input.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      Toast.error('Chỉ chấp nhận ảnh JPG, PNG hoặc WebP');
      input.value = '';
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      Toast.error('Ảnh combo không được vượt quá 2 MB');
      input.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => this.setComboImage(String(reader.result || ''));
    reader.onerror = () => Toast.error('Không thể đọc ảnh đã chọn');
    reader.readAsDataURL(file);
  },
};
