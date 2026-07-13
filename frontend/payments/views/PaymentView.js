/**
 * Mục đích: Lớp View dựng giao diện và cập nhật DOM cho miền thanh toán.
 */
/* CineTicket - View thanh toán */
// Đối tượng PaymentView đóng vai trò lớp hiển thị, dựng HTML và cập nhật DOM.
const PaymentView = {
  _selectedMethod: null,
  _processing: false,
  _holdTimer: null,
  _methodAvailability: {},

  // Dựng phần giao diện tương ứng trong khối render.
  async render() {
    // Kiểm tra trạng thái đăng nhập hoặc vai trò trước khi cho phép thao tác.
    if (!AuthController.checkAuth()) return;
    this._clearHoldCountdown();
    const booking = State.get('currentBooking');
    // Kiểm tra trạng thái booking hoặc thanh toán để chọn bước giao diện tiếp theo.
    if (!booking) {
      Toast.warning('Không có thông tin đặt vé');
      Router.navigate('/');
      return;
    }
    // Kiểm tra trạng thái booking hoặc thanh toán để chọn bước giao diện tiếp theo.
    if (booking.backendBookingId) {
      // Bắt đầu thao tác có thể thất bại để hiển thị phản hồi phù hợp cho người dùng.
      try {
        const persistedBooking = await API.getAdminBookingDetail(booking.backendBookingId);
        // Kiểm tra trạng thái booking hoặc thanh toán để chọn bước giao diện tiếp theo.
        if (persistedBooking.status === 'PAID') {
          State.set('currentBooking', null);
          SeatController.selectedSeats = [];
          Router.navigate(`/ticket/${booking.backendBookingId}`);
          Toast.info('Đơn hàng đã được thanh toán. Đang mở vé của bạn.');
          return;
        }
        // Kiểm tra trạng thái booking hoặc thanh toán để chọn bước giao diện tiếp theo.
        if (['CANCELLED', 'EXPIRED'].includes(persistedBooking.status)) {
          State.set('currentBooking', null);
          SeatController.selectedSeats = [];
          Toast.error('Đơn hàng không còn hiệu lực. Vui lòng chọn ghế lại.');
          Router.navigate(booking.showtimeId ? `/seats/${booking.showtimeId}` : '/movies');
          return;
        }
      } catch (error) {
        console.warn('Could not refresh booking status:', error);
      }
    }

    const movie = MovieModel.getById(booking.movieId);
    const showtime = ShowtimeModel.getById(booking.showtimeId);
    const cinema = showtime ? CinemaModel.getById(showtime.cinemaId) : null;
    await this._loadPaymentMethods();
    document.getElementById('footer').style.display = '';
    const main = document.getElementById('main-content');
    // Dừng hoặc đổi hướng luồng khi dữ liệu bắt buộc chưa sẵn sàng.
    if (!main) return;

    const seatNames = booking.seats.map((seat) => typeof seat === 'object' ? seat.id : seat).join(', ');
    const bookingCode = booking.backendBookingId ? booking.backendBookingId.toUpperCase().slice(0, 12) : 'ĐANG TẠO';
    const seatDetails = booking.seats.map((seat) => {
      const type = typeof seat === 'object' ? seat.type : 'normal';
      const price = typeof seat === 'object' ? seat.price : booking.totalPrice / booking.seats.length;
      const label = type === 'vip' ? 'VIP' : type === 'couple' ? 'Đôi' : 'Thường';
      return `<div class="order-row"><span class="order-row-label">Ghế ${typeof seat === 'object' ? seat.id : seat} (${label})</span><span class="order-row-value">${Helpers.formatCurrency(price)}</span></div>`;
    }).join('');

    main.innerHTML = `
    <div class="payment-page">
      <div class="container">
        <div class="booking-steps" style="max-width:680px;margin:0 auto 40px;">
          <div class="booking-step done"><div class="booking-step-num"><i class="fas fa-check"></i></div><span class="booking-step-label">Chọn phim</span></div>
          <div class="booking-step-divider done"></div>
          <div class="booking-step done"><div class="booking-step-num"><i class="fas fa-check"></i></div><span class="booking-step-label">Chọn ghế</span></div>
          <div class="booking-step-divider done"></div>
          <div class="booking-step done"><div class="booking-step-num"><i class="fas fa-check"></i></div><span class="booking-step-label">Bắp nước</span></div>
          <div class="booking-step-divider"></div>
          <div class="booking-step active"><div class="booking-step-num">4</div><span class="booking-step-label">Thanh toán</span></div>
        </div>

        <div class="payment-layout">
          <div>
            <div class="booking-card">
              <div class="booking-card-header">
                <div class="booking-card-title"><span class="step-badge">4</span> Thanh Toán Online</div>
              </div>
              <div class="booking-card-body">
                <form id="payment-form" onsubmit="PaymentController.handleSubmit(event, PaymentView._selectedMethod)">
                  <div class="payment-methods">
                    ${this._methodOption('sepay', 'fas fa-qrcode', 'sepay', 'SePay QR', 'Chuyển khoản ngân hàng, tự động xác nhận')}
                    ${this._methodOption('vnpay', 'fas fa-qrcode', 'vnpay', 'VNPay', 'Thanh toán qua VNPay QR')}
                    ${this._methodOption('momo', 'fas fa-mobile-alt', 'momo', 'MoMo', 'Thanh toán qua ví MoMo')}
                    ${this._methodOption('zalopay', 'fas fa-wallet', 'zalopay', 'ZaloPay', 'Thanh toán qua ví ZaloPay')}
                    ${this._methodOption('card', 'fas fa-credit-card', 'card', 'Thẻ tín dụng / ghi nợ', 'Visa, MasterCard, JCB')}
                  </div>

                  <div class="card-form" id="card-form">
                    <div class="form-group">
                      <label class="form-label">Số Thẻ</label>
                      <input type="text" class="form-control" placeholder="0000 0000 0000 0000" maxlength="19"
                        oninput="this.value=this.value.replace(/\\D/g,'').replace(/(.{4})/g,'$1 ').trim()" />
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

                  <button type="submit" class="btn btn-primary btn-block btn-lg" style="margin-top:24px;" id="pay-btn">
                    <i class="fas fa-lock"></i> Xác Nhận Thanh Toán
                  </button>
                </form>
              </div>
            </div>
          </div>

          <div class="order-panel">
            <div class="order-panel-header"><i class="fas fa-receipt"></i> Tóm Tắt Đơn Hàng</div>
            <div class="order-panel-body">
              <div class="order-movie-mini">
                <img class="order-poster" src="${movie ? movie.poster : API.moviePosterFallback}" alt="" onerror="this.src=API.moviePosterFallback" />
                <div>
                  <div class="order-movie-name">${movie ? Helpers.escapeHtml(movie.title) : ''}</div>
                  <div class="order-movie-details">
                    ${cinema ? Helpers.escapeHtml(cinema.shortName || cinema.name) : ''}<br>
                    ${showtime ? `${showtime.date} - ${showtime.startTime}` : ''}
                  </div>
                </div>
              </div>
              <div class="order-line"><span class="order-line-label">Mã Đặt Vé</span><span class="order-line-value">${Helpers.escapeHtml(bookingCode)}</span></div>
              <div class="order-line"><span class="order-line-label">Rạp Chiếu</span><span class="order-line-value">${cinema ? Helpers.escapeHtml(cinema.name || cinema.shortName) : ''}</span></div>
              <div class="order-line"><span class="order-line-label">Ghế</span><span class="order-line-value" style="font-size:0.85rem;">${Helpers.escapeHtml(seatNames)}</span></div>
              <div class="order-line"><span class="order-line-label">Giữ ghế còn lại</span><span class="order-line-value" id="booking-hold-countdown">--:--</span></div>
              ${seatDetails}
              ${this._comboSummary(booking.comboItems || [])}
              <div class="order-line" id="discount-line" style="display:none;">
                <span class="order-line-label" style="color:var(--color-success);">Giảm Giá</span>
                <span class="order-line-value" style="color:var(--color-success);" id="discount-value">- 0 ₫</span>
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

    <div id="payment-processing-overlay" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.8);z-index:var(--z-modal);align-items:center;justify-content:center;">
      <div style="text-align:center;color:#fff;">
        <div class="processing-icon"><i class="fas fa-credit-card"></i></div>
        <h3 style="margin-bottom:8px;">Đang Xử Lý Thanh Toán</h3>
        <p style="color:rgba(255,255,255,0.7);">Vui lòng không tắt trang này...</p>
        <div class="spinner" style="margin-top:24px;"></div>
      </div>
    </div>`;

    document.querySelectorAll('.payment-method-option').forEach((option) => {
      option.addEventListener('click', () => {
        // Đánh giá điều kiện hiện tại để cập nhật giao diện và trạng thái đúng nhánh.
        if (option.classList.contains('disabled')) return;
        this._selectedMethod = option.dataset.method;
        document.querySelectorAll('.payment-method-option').forEach((item) => item.classList.remove('selected'));
        option.classList.add('selected');
        const cardForm = document.getElementById('card-form');
        // Đánh giá điều kiện hiện tại để cập nhật giao diện và trạng thái đúng nhánh.
        if (cardForm) cardForm.classList.toggle('show', this._selectedMethod === 'card');
      });
    });
    this._startHoldCountdown(booking.expiresAt, booking.showtimeId);
  },

  // Đọc và lọc dữ liệu cần thiết trong khối _loadPaymentMethods.
  async _loadPaymentMethods() {
    let methods;
    // Bắt đầu thao tác có thể thất bại để hiển thị phản hồi phù hợp cho người dùng.
    try {
      const response = await API.getPaymentMethods();
      methods = response.methods;
    } catch (error) {
      console.warn('Could not load payment method availability:', error);
      methods = [
        { id: 'sepay', enabled: false, mode: 'live' },
        { id: 'vnpay', enabled: false, mode: 'live' },
        { id: 'momo', enabled: true, mode: 'demo' },
        { id: 'zalopay', enabled: true, mode: 'demo' },
        { id: 'card', enabled: true, mode: 'demo' },
      ];
    }

    this._methodAvailability = Object.fromEntries(
      methods.map((method) => [method.id, method]),
    );
    const selected = this._methodAvailability[this._selectedMethod];
    // Dừng hoặc đổi hướng luồng khi dữ liệu bắt buộc chưa sẵn sàng.
    if (!selected?.enabled) {
      this._selectedMethod = methods.find((method) => method.enabled)?.id || null;
    }
  },

  // Tính toán giá trị tổng hợp trong khối _comboSummary.
  _comboSummary(comboItems) {
    return comboItems.map((combo) => `
      <div class="order-row">
        <span class="order-row-label">${Helpers.escapeHtml(combo.name)} x${combo.quantity}</span>
        <span class="order-row-value">${Helpers.formatCurrency(Number(combo.lineTotal || combo.unitPrice * combo.quantity || 0))}</span>
      </div>
    `).join('');
  },

  // Áp dụng quy tắc ghế và quyền sở hữu giữ ghế trong khối _startHoldCountdown.
  _startHoldCountdown(expiresAt, showtimeId) {
    const el = document.getElementById('booking-hold-countdown');
    // Dừng hoặc đổi hướng luồng khi dữ liệu bắt buộc chưa sẵn sàng.
    if (!el) return;
    // Dừng hoặc đổi hướng luồng khi dữ liệu bắt buộc chưa sẵn sàng.
    if (!expiresAt) {
      el.textContent = 'Không giới hạn';
      return;
    }

    const update = async () => {
      const remaining = new Date(expiresAt).getTime() - Date.now();
      // Đánh giá điều kiện hiện tại để cập nhật giao diện và trạng thái đúng nhánh.
      if (remaining <= 0) {
        this._clearHoldCountdown();
        el.textContent = 'Đã hết hạn';
        // Bắt đầu thao tác có thể thất bại để hiển thị phản hồi phù hợp cho người dùng.
        try {
          await API.expireBookings();
        } catch (error) {
          console.warn('Could not expire pending bookings:', error);
        }
        State.set('currentBooking', null);
        Toast.error('Phiên giữ ghế đã hết hạn. Vui lòng chọn ghế lại.');
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

  // Xử lý việc gỡ bỏ, hủy hoặc giải phóng dữ liệu trong khối _clearHoldCountdown.
  _clearHoldCountdown() {
    // Kiểm tra trạng thái ghế và lượt giữ ghế trước khi cập nhật lựa chọn.
    if (this._holdTimer) {
      clearInterval(this._holdTimer);
      this._holdTimer = null;
    }
  },

  // Dựng phần giao diện tương ứng trong khối _methodOption.
  _methodOption(method, iconClass, iconType, label, desc) {
    const availability = this._methodAvailability[method] || { enabled: false, mode: 'live' };
    const selected = availability.enabled && method === this._selectedMethod;
    const status = availability.enabled
      ? availability.mode === 'demo' ? '<span class="payment-method-badge">Demo</span>' : ''
      : '<span class="payment-method-badge unavailable">Chưa cấu hình</span>';
    return `
    <label class="payment-method-option ${selected ? 'selected' : ''} ${availability.enabled ? '' : 'disabled'}" data-method="${method}">
      <input type="radio" name="payment-method" value="${method}" ${selected ? 'checked' : ''} ${availability.enabled ? '' : 'disabled'} />
      <div class="payment-method-icon ${iconType}"><i class="${iconClass}"></i></div>
      <div class="payment-method-copy">
        <div class="payment-method-title"><div class="payment-method-label">${label}</div>${status}</div>
        <div class="payment-method-desc">${desc}</div>
      </div>
    </label>`;
  },

  // Dựng phần giao diện tương ứng trong khối showSepayQr.
  showSepayQr(payment, booking) {
    const content = `
      <div style="text-align:center;">
        <img src="${payment.qrUrl}" alt="SePay QR" style="width:min(320px,100%);border-radius:12px;background:#fff;padding:10px;" />
        <h3 style="margin:16px 0 8px;">${Helpers.formatCurrency(payment.amount)}</h3>
        <p style="color:var(--color-text-muted);">${Helpers.escapeHtml(payment.bankCode)} · ${Helpers.escapeHtml(payment.accountNumber)}</p>
        <p style="margin-top:8px;">Nội dung: <strong style="color:var(--color-primary);">${Helpers.escapeHtml(payment.paymentCode)}</strong></p>
        <p id="sepay-status" style="margin-top:16px;color:var(--color-warning);"><i class="fas fa-spinner fa-spin"></i> Đang chờ SePay xác nhận...</p>
      </div>`;
    Modal.show('Thanh toán SePay', content, { size: 'md' });
    const poll = setInterval(async () => {
      try {
        const detail = await API.getAdminBookingDetail(payment.bookingId);
        const status = detail.booking?.status || detail.status;
        // Kiểm tra trạng thái booking hoặc thanh toán để chọn bước giao diện tiếp theo.
        if (status === 'PAID') {
          clearInterval(poll);
          Modal.close();
          this._clearHoldCountdown();
          State.set('currentBooking', null);
          SeatController.selectedSeats = [];
          Router.navigate(`/ticket/${payment.bookingId}`);
          Toast.success('SePay đã xác nhận thanh toán!');
        }
      } catch (error) {
        console.warn('SePay status poll failed:', error);
      }
    }, 3000);
    setTimeout(() => clearInterval(poll), 10 * 60 * 1000);
  },

  // Cập nhật trạng thái hoặc dữ liệu trong khối updateTotal.
  updateTotal(total, discount) {
    const finalEl = document.getElementById('final-total');
    const discountLine = document.getElementById('discount-line');
    const discountVal = document.getElementById('discount-value');
    // Xử lý riêng trường hợp danh sách rỗng hoặc có số lượng không hợp lệ.
    if (finalEl) finalEl.textContent = Helpers.formatCurrency(total - discount);
    // Xử lý riêng trường hợp danh sách rỗng hoặc có số lượng không hợp lệ.
    if (discountLine) discountLine.style.display = discount > 0 ? '' : 'none';
    // Xử lý riêng trường hợp danh sách rỗng hoặc có số lượng không hợp lệ.
    if (discountVal) discountVal.textContent = '- ' + Helpers.formatCurrency(discount);
  },

  // Dựng phần giao diện tương ứng trong khối showPromoResult.
  showPromoResult(promo, discount) {
    const container = document.getElementById('promo-result-container');
    // Dừng hoặc đổi hướng luồng khi dữ liệu bắt buộc chưa sẵn sàng.
    if (!container) return;
    container.innerHTML = `<div class="promo-result"><span class="promo-result-success"><i class="fas fa-check-circle"></i> ${Helpers.escapeHtml(promo.title)} - Giảm ${Helpers.formatCurrency(discount)}</span></div>`;
  },

  // Thực hiện trách nhiệm riêng của khối hidePromoResult.
  hidePromoResult() {
    const container = document.getElementById('promo-result-container');
    // Đánh giá điều kiện hiện tại để cập nhật giao diện và trạng thái đúng nhánh.
    if (container) container.innerHTML = '';
  },

  // Dựng phần giao diện tương ứng trong khối showProcessing.
  showProcessing() {
    this._processing = true;
    const overlay = document.getElementById('payment-processing-overlay');
    // Đánh giá điều kiện hiện tại để cập nhật giao diện và trạng thái đúng nhánh.
    if (overlay) overlay.style.display = 'flex';
    const btn = document.getElementById('pay-btn');
    // Đánh giá điều kiện hiện tại để cập nhật giao diện và trạng thái đúng nhánh.
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<div class="spinner spinner-sm"></div> Đang xử lý...';
    }
  },

  // Thực hiện trách nhiệm riêng của khối hideProcessing.
  hideProcessing() {
    this._processing = false;
    const overlay = document.getElementById('payment-processing-overlay');
    // Đánh giá điều kiện hiện tại để cập nhật giao diện và trạng thái đúng nhánh.
    if (overlay) overlay.style.display = 'none';
    const btn = document.getElementById('pay-btn');
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-lock"></i> Xác Nhận Thanh Toán';
    }
  },
};
