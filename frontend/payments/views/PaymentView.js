/* CineTicket - Payment View */
const PaymentView = {
  _selectedMethod: 'vnpay',
  _processing: false,
  _holdTimer: null,
  _combos: [],
  _selectedCombos: {},

  async render() {
    if (!AuthController.checkAuth()) return;
    this._clearHoldCountdown();
    this._selectedCombos = {};
    const booking = State.get('currentBooking');
    if (!booking) { Toast.warning('Không có thông tin đặt vé'); Router.navigate('/'); return; }
    try {
      this._combos = await API.getConcessionCombos();
    } catch (error) {
      console.warn('Could not load concession combos:', error);
      this._combos = [];
    }
    const movie = MovieModel.getById(booking.movieId);
    const showtime = ShowtimeModel.getById(booking.showtimeId);
    const cinema = showtime ? CinemaModel.getById(showtime.cinemaId) : null;
    document.getElementById('footer').style.display = '';
    const main = document.getElementById('main-content');
    if (!main) return;

    const seatNames = booking.seats.map(s => typeof s === 'object' ? s.id : s).join(', ');
    const bookingCode = booking.backendBookingId
      ? booking.backendBookingId.toUpperCase().slice(0, 12)
      : 'DANG TAO';
    const seatDetails = booking.seats.map(s => {
      const type = typeof s === 'object' ? s.type : 'normal';
      const price = typeof s === 'object' ? s.price : booking.totalPrice / booking.seats.length;
      return `<div class="order-row"><span class="order-row-label">Ghế ${typeof s==='object'?s.id:s} (${type==='vip'?'VIP':type==='couple'?'Đôi':'Thường'})</span><span class="order-row-value">${Helpers.formatCurrency(price)}</span></div>`;
    }).join('');

    main.innerHTML = `
    <div class="payment-page">
      <div class="container">
        <div class="booking-steps" style="max-width:600px;margin:0 auto 40px;">
          <div class="booking-step done"><div class="booking-step-num"><i class="fas fa-check"></i></div><span class="booking-step-label">Chọn Phim</span></div>
          <div class="booking-step-divider done"></div>
          <div class="booking-step done"><div class="booking-step-num"><i class="fas fa-check"></i></div><span class="booking-step-label">Chọn Ghế</span></div>
          <div class="booking-step-divider"></div>
          <div class="booking-step active"><div class="booking-step-num">3</div><span class="booking-step-label">Thanh Toán</span></div>
          <div class="booking-step-divider"></div>
          <div class="booking-step"><div class="booking-step-num">4</div><span class="booking-step-label">Vé Của Bạn</span></div>
        </div>

        <div class="payment-layout">
          <!-- Left -->
          <div>
            <!-- Payment Methods -->
            <div class="booking-card">
              <div class="booking-card-header">
                <div class="booking-card-title"><span class="step-badge">1</span> Thanh Toán Online</div>
              </div>
              <div class="booking-card-body">
                <form id="payment-form" onsubmit="PaymentController.handleSubmit(event, PaymentView._selectedMethod)">
                  <div class="payment-methods">
                    ${this._methodOption('card', 'fas fa-credit-card', 'card', 'The Tin Dung / Ghi No', 'Visa, MasterCard, JCB')}
                    ${this._methodOption('momo', 'fas fa-mobile-alt', 'momo', 'MoMo', 'Thanh toan qua vi MoMo')}
                    ${this._methodOption('vnpay', 'fas fa-qrcode', 'vnpay', 'VNPay', 'Thanh toán qua VNPay QR')}
                    ${this._methodOption('zalopay', 'fas fa-wallet', 'zalopay', 'ZaloPay', 'Thanh toan qua vi ZaloPay')}
                  </div>
                  <!-- Card Form (hidden) -->
                  <div class="card-form" id="card-form">
                    <div class="form-group">
                      <label class="form-label">Số Thẻ</label>
                      <div class="card-number-wrap">
                        <input type="text" class="form-control" placeholder="0000 0000 0000 0000" maxlength="19"
                          oninput="this.value=this.value.replace(/\D/g,'').replace(/(.{4})/g,'$1 ').trim()" />
                      </div>
                    </div>
                    <div class="card-form-row">
                      <div class="form-group">
                        <label class="form-label">Ngày Hết Hạn</label>
                        <input type="text" class="form-control" placeholder="MM/YY" maxlength="5" />
                      </div>
                      <div class="form-group">
                        <label class="form-label">CVV</label>
                        <input type="text" class="form-control" placeholder="123" maxlength="3" />
                      </div>
                    </div>
                    <div class="form-group">
                      <label class="form-label">Tên Chủ Thẻ</label>
                      <input type="text" class="form-control" placeholder="NGUYEN VAN A" style="text-transform:uppercase;" />
                    </div>
                  </div>

                  <div style="margin-top:24px;padding-top:24px;border-top:1px solid var(--color-border);">
                    <h5 style="margin-bottom:12px;"><i class="fas fa-shopping-basket" style="color:var(--color-primary);"></i> Combo Bap Nuoc</h5>
                    <div id="combo-list">${this._comboList()}</div>
                  </div>

                  <!-- Promo Code -->
                  <div style="display:none;margin-top:24px;padding-top:24px;border-top:1px solid var(--color-border);">
                    <h5 style="margin-bottom:12px;"><i class="fas fa-tags" style="color:var(--color-primary);"></i> Mã Khuyến Mãi</h5>
                    <div class="promo-input-row">
                      <input type="text" class="form-control" id="promo-code-input" placeholder="Nhập mã (VD: SUMMER25)" style="text-transform:uppercase;" />
                      <button type="button" class="btn btn-outline" onclick="PaymentController.handleApplyPromo(document.getElementById('promo-code-input').value.trim())">
                        Áp Dụng
                      </button>
                    </div>
                    <div id="promo-result-container"></div>
                    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px;">
                      ${API.mockData.promotions.filter(p=>p.isActive).map(p=>`
                        <button type="button" class="badge badge-outline" style="cursor:pointer;padding:6px 12px;"
                          onclick="document.getElementById('promo-code-input').value='${p.code}';PaymentController.handleApplyPromo('${p.code}')">
                          ${p.code} - ${p.discountType==='percent'?(p.discount*100)+'%':Helpers.formatCurrency(p.discount)} off
                        </button>`).join('')}
                    </div>
                  </div>

                  <button type="submit" class="btn btn-primary btn-block btn-lg" style="margin-top:24px;" id="pay-btn">
                    <i class="fas fa-lock"></i> Xác Nhận Thanh Toán
                  </button>
                </form>
              </div>
            </div>
          </div>

          <!-- Right: Order Summary -->
          <div class="order-panel">
            <div class="order-panel-header"><i class="fas fa-receipt"></i> Tóm Tắt Đơn Hàng</div>
            <div class="order-panel-body">
              <div class="order-movie-mini">
                <img class="order-poster" src="${movie ? movie.poster : API.moviePosterFallback}" alt="" onerror="this.src=API.moviePosterFallback" />
                <div>
                  <div class="order-movie-name">${movie ? Helpers.escapeHtml(movie.title) : ''}</div>
                  <div class="order-movie-details">
                    ${cinema ? Helpers.escapeHtml(cinema.shortName) : ''}<br>
                    ${showtime ? showtime.date + ' - ' + showtime.startTime : ''}
                  </div>
                </div>
              </div>
              <div class="order-line">
                <span class="order-line-label">Ma Dat Ve</span>
                <span class="order-line-value">${Helpers.escapeHtml(bookingCode)}</span>
              </div>
              <div class="order-line">
                <span class="order-line-label">Rap Chieu</span>
                <span class="order-line-value">${cinema ? Helpers.escapeHtml(cinema.name || cinema.shortName) : ''}</span>
              </div>
              <div class="order-line">
                <span class="order-line-label">Ghế</span>
                <span class="order-line-value" style="font-size:0.85rem;">${Helpers.escapeHtml(seatNames)}</span>
              </div>
              <div class="order-line">
                <span class="order-line-label">Giu ghe con lai</span>
                <span class="order-line-value" id="booking-hold-countdown">--:--</span>
              </div>
              ${seatDetails}
              <div id="combo-summary"></div>
              <div class="order-line" id="discount-line" style="display:none;">
                <span class="order-line-label" style="color:var(--color-success);">Giảm Giá</span>
                <span class="order-line-value" style="color:var(--color-success);" id="discount-value">- $0.00</span>
              </div>
              <div class="order-final">
                <span>Tổng Cộng</span>
                <span class="order-final-amount" id="final-total">${Helpers.formatCurrency(booking.totalPrice)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Processing Overlay -->
    <div id="payment-processing-overlay" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.8);z-index:var(--z-modal);display:none;align-items:center;justify-content:center;">
      <div style="text-align:center;color:#fff;">
        <div class="processing-icon"><i class="fas fa-credit-card"></i></div>
        <h3 style="margin-bottom:8px;">Đang Xử Lý Thanh Toán</h3>
        <p style="color:rgba(255,255,255,0.7);">Vui lòng không tắt trang này...</p>
        <div class="spinner" style="margin-top:24px;"></div>
      </div>
    </div>`;

    // Bind method selection
    document.querySelectorAll('.payment-method-option').forEach(opt => {
      opt.addEventListener('click', () => {
        this._selectedMethod = opt.dataset.method;
        document.querySelectorAll('.payment-method-option').forEach(o => o.classList.remove('selected'));
        opt.classList.add('selected');
        const cardForm = document.getElementById('card-form');
        if (cardForm) cardForm.classList.toggle('show', this._selectedMethod === 'card');
      });
    });
    this._startHoldCountdown(booking.expiresAt, booking.showtimeId);
    this._renderComboSummary();
  },

  _comboList() {
    if (!this._combos.length) {
      return '<p style="color:var(--color-text-muted);font-size:0.9rem;">Hien chua co combo dang ban.</p>';
    }

    return this._combos.map((combo) => `
      <div class="order-row" style="align-items:center;gap:12px;">
        <img src="${Helpers.escapeHtml(combo.imageUrl || API.moviePosterFallback)}" alt="" style="width:54px;height:54px;object-fit:cover;border-radius:6px;" onerror="this.src=API.moviePosterFallback" />
        <div style="flex:1;min-width:0;">
          <div style="font-weight:700;color:var(--color-text);">${Helpers.escapeHtml(combo.name)}</div>
          <div style="font-size:0.78rem;color:var(--color-text-muted);">${Helpers.escapeHtml(combo.description || '')}</div>
          <div style="font-size:0.85rem;color:var(--color-primary);font-weight:700;">${Helpers.formatCurrency(Number(combo.price))}</div>
        </div>
        <div style="display:flex;align-items:center;gap:8px;">
          <button type="button" class="action-btn" onclick="PaymentView.changeComboQuantity('${combo.id}', -1)">-</button>
          <span id="combo-qty-${combo.id}" style="min-width:22px;text-align:center;font-weight:700;">0</span>
          <button type="button" class="action-btn edit" onclick="PaymentView.changeComboQuantity('${combo.id}', 1)">+</button>
        </div>
      </div>
    `).join('');
  },

  changeComboQuantity(comboId, delta) {
    const current = this._selectedCombos[comboId] || 0;
    const next = Math.max(0, Math.min(10, current + delta));
    if (next === 0) {
      delete this._selectedCombos[comboId];
    } else {
      this._selectedCombos[comboId] = next;
    }
    const qtyEl = document.getElementById(`combo-qty-${comboId}`);
    if (qtyEl) qtyEl.textContent = String(next);
    this._renderComboSummary();
  },

  getSelectedComboItems() {
    return Object.entries(this._selectedCombos).map(([comboId, quantity]) => ({ comboId, quantity }));
  },

  getComboSubtotal() {
    return this._combos.reduce((sum, combo) => {
      return sum + Number(combo.price || 0) * (this._selectedCombos[combo.id] || 0);
    }, 0);
  },

  _renderComboSummary() {
    const booking = State.get('currentBooking');
    const container = document.getElementById('combo-summary');
    if (!booking || !container) return;
    const selected = this._combos.filter((combo) => this._selectedCombos[combo.id]);
    container.innerHTML = selected.map((combo) => `
      <div class="order-row">
        <span class="order-row-label">${Helpers.escapeHtml(combo.name)} x${this._selectedCombos[combo.id]}</span>
        <span class="order-row-value">${Helpers.formatCurrency(Number(combo.price) * this._selectedCombos[combo.id])}</span>
      </div>
    `).join('');
    this.updateTotal(booking.totalPrice + this.getComboSubtotal(), PaymentController._discount || 0);
  },

  _startHoldCountdown(expiresAt, showtimeId) {
    const el = document.getElementById('booking-hold-countdown');
    if (!el) return;
    if (!expiresAt) {
      el.textContent = 'Khong gioi han';
      return;
    }

    const update = async () => {
      const remaining = new Date(expiresAt).getTime() - Date.now();
      if (remaining <= 0) {
        this._clearHoldCountdown();
        el.textContent = 'Da het han';
        try {
          await API.expireBookings();
        } catch (error) {
          console.warn('Could not expire pending bookings:', error);
        }
        State.set('currentBooking', null);
        Toast.error('Phien giu ghe da het han. Vui long chon ghe lai.');
        Router.navigate(showtimeId ? `/seats/${showtimeId}` : '/movies');
        return;
      }

      const totalSeconds = Math.ceil(remaining / 1000);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      el.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    };

    update();
    this._holdTimer = setInterval(update, 1000);
  },

  _clearHoldCountdown() {
    if (this._holdTimer) {
      clearInterval(this._holdTimer);
      this._holdTimer = null;
    }
  },

  _methodOption(method, iconClass, iconType, label, desc) {
    return `
    <label class="payment-method-option ${method === this._selectedMethod ? 'selected' : ''}" data-method="${method}">
      <input type="radio" name="payment-method" value="${method}" ${method === this._selectedMethod ? 'checked' : ''} />
      <div class="payment-method-icon ${iconType}"><i class="${iconClass}"></i></div>
      <div>
        <div class="payment-method-label">${label}</div>
        <div class="payment-method-desc">${desc}</div>
      </div>
    </label>`;
  },

  updateTotal(total, discount) {
    const finalEl = document.getElementById('final-total');
    const discountLine = document.getElementById('discount-line');
    const discountVal = document.getElementById('discount-value');
    if (finalEl) finalEl.textContent = Helpers.formatCurrency(total - discount);
    if (discountLine) discountLine.style.display = discount > 0 ? '' : 'none';
    if (discountVal) discountVal.textContent = '- ' + Helpers.formatCurrency(discount);
  },

  showPromoResult(promo, discount) {
    const container = document.getElementById('promo-result-container');
    if (!container) return;
    container.innerHTML = `
      <div class="promo-result">
        <span class="promo-result-success"><i class="fas fa-check-circle"></i> ${Helpers.escapeHtml(promo.title)} — Giảm ${Helpers.formatCurrency(discount)}</span>
        <span class="promo-remove-btn" onclick="PaymentController.handleRemovePromo()"><i class="fas fa-times"></i> Xóa</span>
      </div>`;
  },

  hidePromoResult() {
    const container = document.getElementById('promo-result-container');
    if (container) container.innerHTML = '';
  },

  showProcessing() {
    this._processing = true;
    const overlay = document.getElementById('payment-processing-overlay');
    if (overlay) overlay.style.display = 'flex';
    const btn = document.getElementById('pay-btn');
    if (btn) { btn.disabled = true; btn.innerHTML = '<div class="spinner spinner-sm"></div> Đang xử lý...'; }
  },

  hideProcessing() {
    this._processing = false;
    const overlay = document.getElementById('payment-processing-overlay');
    if (overlay) overlay.style.display = 'none';
    const btn = document.getElementById('pay-btn');
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-lock"></i> Xác Nhận Thanh Toán'; }
  }
};
