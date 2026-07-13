/* CRTicket - Giao diện thanh toán SePay */
const PaymentView = {
  _processing: false,
  _holdTimer: null,
  _sepayPollTimer: null,
  _sepayCountdownTimer: null,

  // Render trang thanh toán và tự tạo mã QR SePay cho booking hiện tại.
  async render() {
    if (!AuthController.checkAuth()) return;
    this._clearHoldCountdown();
    this._clearSepayTimers();

    const booking = State.get('currentBooking');
    if (!booking) {
      Toast.warning('Không có thông tin đặt vé');
      Router.navigate('/');
      return;
    }

    const movie = MovieModel.getById(booking.movieId);
    const showtime = ShowtimeModel.getById(booking.showtimeId);
    const cinema = showtime ? CinemaModel.getById(showtime.cinemaId) : null;
    const isFreeBooking = Number(booking.totalPrice || 0) === 0;
    const ticketDiscount = (booking.seats || []).reduce(
      (sum, seat) => sum + Math.max(0, Number(seat.originalPrice || seat.price || 0) - Number(seat.price || 0)),
      0,
    );
    const main = document.getElementById('main-content');
    if (!main) return;

    document.getElementById('footer').style.display = '';

    const seatNames = booking.seats
      .map((seat) => (typeof seat === 'object' ? seat.id : seat))
      .join(', ');
    const bookingCode = booking.backendBookingId
      ? booking.backendBookingId.toUpperCase().slice(0, 12)
      : 'ĐANG TẠO';
    const seatDetails = booking.seats.map((seat) => {
      const type = typeof seat === 'object' ? seat.type : 'normal';
      const price = typeof seat === 'object'
        ? Number(seat.price || 0)
        : Number(booking.totalPrice || 0) / Math.max(booking.seats.length, 1);
      const label = type === 'couple' ? 'Đôi' : 'Thường';
      const seatId = typeof seat === 'object' ? seat.id : seat;
      return `
        <div class="order-row">
          <span class="order-row-label">Ghế ${Helpers.escapeHtml(seatId)} (${label})</span>
          <span class="order-row-value">${Helpers.formatCurrency(price)}</span>
        </div>`;
    }).join('');

    main.innerHTML = `
      <div class="payment-page">
        <div class="container">
          <div class="booking-steps payment-steps">
            <div class="booking-step done"><div class="booking-step-num"><i class="fas fa-check"></i></div><span class="booking-step-label">Chọn phim</span></div>
            <div class="booking-step-divider done"></div>
            <div class="booking-step done"><div class="booking-step-num"><i class="fas fa-check"></i></div><span class="booking-step-label">Chọn ghế</span></div>
            <div class="booking-step-divider done"></div>
            <div class="booking-step done"><div class="booking-step-num"><i class="fas fa-check"></i></div><span class="booking-step-label">Bắp nước</span></div>
            <div class="booking-step-divider"></div>
            <div class="booking-step active"><div class="booking-step-num">4</div><span class="booking-step-label">Thanh toán</span></div>
          </div>

          <div class="payment-layout sepay-payment-layout">
            <section class="booking-card sepay-payment-card">
              <div class="booking-card-header">
                <div>
                  <div class="booking-card-title"><i class="fas fa-${isFreeBooking ? 'ticket-alt' : 'qrcode'}"></i> ${isFreeBooking ? 'Phát hành vé Admin 0 ₫' : 'Thanh toán SePay'}</div>
                  <p class="sepay-payment-subtitle">${isFreeBooking ? 'Đơn hàng Admin không cần thanh toán. Xác nhận để phát hành vé trực tiếp.' : 'Quét QR hoặc chuyển khoản đúng thông tin bên dưới. Hệ thống sẽ tự xác nhận khi SePay gửi webhook hợp lệ.'}</p>
                </div>
              </div>
              <div class="booking-card-body" id="sepay-payment-container">
                ${isFreeBooking ? this._adminFreeTemplate() : this._sepayLoadingTemplate()}
              </div>
            </section>

            <aside class="order-panel sepay-order-panel">
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
                <div class="order-line"><span class="order-line-label">Ghế</span><span class="order-line-value order-seat-list">${Helpers.escapeHtml(seatNames)}</span></div>
                <div class="order-line"><span class="order-line-label">Giữ ghế còn lại</span><span class="order-line-value" id="booking-hold-countdown">--:--</span></div>
                ${seatDetails}
                ${booking.ticketDiscountPercent ? `<div class="order-row"><span class="order-row-label" style="color:var(--color-success);">Ưu đãi ${booking.accountRole === 'ADMIN' ? 'Admin' : 'Nhân viên'} (${booking.ticketDiscountPercent}%)</span><span class="order-row-value" style="color:var(--color-success);">- ${Helpers.formatCurrency(ticketDiscount)}</span></div>` : ''}
                ${this._comboSummary(booking.comboItems || [])}
                <div class="order-final">
                  <span>Tổng Cộng</span>
                  <span class="order-final-amount" id="final-total">${Helpers.formatCurrency(booking.totalPrice)}</span>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>`;

    this._startHoldCountdown(booking.expiresAt, booking.showtimeId);
    if (!isFreeBooking) PaymentController.startSepayPayment(booking);
  },

  _comboSummary(comboItems) {
    return comboItems.map((combo) => `
      <div class="order-row">
        <span class="order-row-label">${Helpers.escapeHtml(combo.name)} x${combo.quantity}</span>
        <span class="order-row-value">${Helpers.formatCurrency(Number(combo.lineTotal || combo.unitPrice * combo.quantity || 0))}</span>
      </div>
    `).join('');
  },

  _adminFreeTemplate() {
    return `
      <div class="sepay-inline-state admin-free-ticket-state">
        <i class="fas fa-shield-alt"></i>
        <h3>Vé Admin có tổng tiền 0 ₫</h3>
        <p>Không tạo giao dịch SePay cho đơn hàng này. Bấm xác nhận để phát hành vé.</p>
        <button class="btn btn-primary" onclick="PaymentController.startSepayPayment(State.get('currentBooking'))">
          <i class="fas fa-ticket-alt"></i> Xác nhận vé 0 ₫
        </button>
      </div>`;
  },

  renderAdminFreeProcessing() {
    const container = document.getElementById('sepay-payment-container');
    if (!container) return;
    container.innerHTML = `
      <div class="sepay-inline-state">
        <div class="spinner"></div>
        <h3>Đang phát hành vé Admin</h3>
        <p>Vui lòng giữ trang này trong khi hệ thống xác nhận đơn hàng 0 ₫.</p>
      </div>`;
  },

  renderAdminFreeError(message) {
    const container = document.getElementById('sepay-payment-container');
    if (!container) return;
    container.innerHTML = `
      <div class="sepay-inline-state sepay-inline-error">
        <i class="fas fa-exclamation-circle"></i>
        <h3>Không thể phát hành vé Admin</h3>
        <p>${Helpers.escapeHtml(message || 'Vui lòng thử lại.')}</p>
        <button class="btn btn-primary" onclick="PaymentController.startSepayPayment(State.get('currentBooking'))">
          <i class="fas fa-sync-alt"></i> Thử lại
        </button>
      </div>`;
  },

  renderSepayLoading() {
    const container = document.getElementById('sepay-payment-container');
    if (container) container.innerHTML = this._sepayLoadingTemplate();
  },

  _sepayLoadingTemplate() {
    return `
      <div class="sepay-inline-state">
        <div class="spinner"></div>
        <h3>Đang tạo mã QR SePay</h3>
        <p>Vui lòng giữ trang này trong khi hệ thống chuẩn bị thông tin chuyển khoản.</p>
      </div>`;
  },

  renderSepayError(message) {
    this._clearSepayTimers();
    const container = document.getElementById('sepay-payment-container');
    if (!container) return;
    container.innerHTML = `
      <div class="sepay-inline-state sepay-inline-error">
        <i class="fas fa-exclamation-circle"></i>
        <h3>Không tạo được mã QR</h3>
        <p>${Helpers.escapeHtml(message || 'Vui lòng kiểm tra cấu hình SePay và thử lại.')}</p>
        <button class="btn btn-primary" onclick="PaymentController.startSepayPayment(State.get('currentBooking'))">
          <i class="fas fa-sync-alt"></i> Thử lại
        </button>
      </div>`;
  },

  renderSepayQr(payment, booking) {
    this._clearSepayTimers();
    const container = document.getElementById('sepay-payment-container');
    if (!container) return;

    const accountNumber = payment.bankAccount || payment.accountNumber || '';
    const transferContent = payment.transferContent || payment.providerRef || payment.paymentCode || '';
    const amount = Math.round(Number(payment.amount || booking.totalPrice || 0));

    container.innerHTML = `
      <div class="sepay-qr-layout">
        <div class="sepay-qr-panel">
          <div class="sepay-qr-frame">
            <img src="${payment.qrUrl}" alt="Mã QR thanh toán SePay" />
          </div>
          <div class="sepay-status-pill" id="sepay-status">
            <i class="fas fa-spinner fa-spin"></i> Đang chờ SePay xác nhận...
          </div>
          <div class="sepay-countdown" id="sepay-countdown">Thời gian còn lại: --:--</div>
        </div>

        <div class="sepay-transfer-panel">
          <div class="sepay-transfer-title">Thông tin chuyển khoản</div>
          ${this._transferRow('Ngân hàng', payment.bankCode || '')}
          ${this._transferRow('Số tài khoản', accountNumber, true)}
          ${this._transferRow('Chủ tài khoản', payment.accountName || '')}
          ${this._transferRow('Số tiền', Helpers.formatCurrency(amount), true, String(amount))}
          ${this._transferRow('Nội dung', transferContent, true)}
          <div class="sepay-warning">
            <i class="fas fa-triangle-exclamation"></i>
            <span>Vui lòng chuyển khoản đúng số tiền và đúng nội dung để hệ thống tự xác nhận.</span>
          </div>
        </div>
      </div>`;

    this._startSepayCountdown(payment.expiresAt);
    this._startSepayPolling(payment.bookingId);
  },

  _transferRow(label, value, copyable = false, copyValue = value) {
    return `
      <div class="sepay-transfer-row">
        <span>${Helpers.escapeHtml(label)}</span>
        <strong>${Helpers.escapeHtml(value)}</strong>
        ${copyable ? this._copyButton(copyValue) : ''}
      </div>`;
  },

  _copyButton(value) {
    return `<button class="sepay-copy-btn" onclick="PaymentView.copySepayText(decodeURIComponent('${encodeURIComponent(String(value || ''))}'))">Copy</button>`;
  },

  _startSepayPolling(bookingId) {
    this._sepayPollTimer = setInterval(async () => {
      try {
        const status = await API.getPaymentStatus(bookingId);
        if (status.bookingStatus === 'PAID' || status.paymentStatus === 'SUCCESS') {
          this._clearSepayTimers();
          this._clearHoldCountdown();
          State.set('currentBooking', null);
          SeatController.selectedSeats = [];
          Router.navigate(`/ticket/${bookingId}`);
          Toast.success('SePay đã xác nhận thanh toán!');
          return;
        }

        if (status.bookingStatus === 'EXPIRED' || status.paymentStatus === 'EXPIRED') {
          this._clearSepayTimers();
          const statusEl = document.getElementById('sepay-status');
          if (statusEl) statusEl.innerHTML = '<i class="fas fa-clock"></i> Mã thanh toán đã hết hạn';
          Toast.error('Mã thanh toán SePay đã hết hạn.');
        }
      } catch (error) {
        console.warn('SePay status poll failed:', error);
        const statusEl = document.getElementById('sepay-status');
        if (statusEl) statusEl.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang kiểm tra lại trạng thái thanh toán...';
      }
    }, 3000);
  },

  _startSepayCountdown(expiresAt) {
    const expiresAtMs = expiresAt ? new Date(expiresAt).getTime() : null;
    const update = () => {
      const el = document.getElementById('sepay-countdown');
      if (!el || !expiresAtMs) return;
      const remaining = expiresAtMs - Date.now();
      if (remaining <= 0) {
        el.textContent = 'Thời gian còn lại: đã hết hạn';
        this._clearSepayTimers();
        const statusEl = document.getElementById('sepay-status');
        if (statusEl) statusEl.innerHTML = '<i class="fas fa-clock"></i> Mã thanh toán đã hết hạn';
        return;
      }
      const totalSeconds = Math.ceil(remaining / 1000);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      el.textContent = `Thời gian còn lại: ${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    };

    update();
    this._sepayCountdownTimer = setInterval(update, 1000);
  },

  _clearSepayTimers() {
    if (this._sepayPollTimer) {
      clearInterval(this._sepayPollTimer);
      this._sepayPollTimer = null;
    }
    if (this._sepayCountdownTimer) {
      clearInterval(this._sepayCountdownTimer);
      this._sepayCountdownTimer = null;
    }
  },

  _startHoldCountdown(expiresAt, showtimeId) {
    const el = document.getElementById('booking-hold-countdown');
    if (!el) return;
    if (!expiresAt) {
      el.textContent = 'Không giới hạn';
      return;
    }

    const update = async () => {
      const remaining = new Date(expiresAt).getTime() - Date.now();
      if (remaining <= 0) {
        this._clearHoldCountdown();
        this._clearSepayTimers();
        el.textContent = 'Đã hết hạn';
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

  _clearHoldCountdown() {
    if (this._holdTimer) {
      clearInterval(this._holdTimer);
      this._holdTimer = null;
    }
  },

  async copySepayText(value) {
    try {
      await navigator.clipboard.writeText(value);
      Toast.success('Đã copy thông tin chuyển khoản');
    } catch (error) {
      console.warn('Could not copy SePay text:', error);
      Toast.warning('Không copy được, vui lòng sao chép thủ công');
    }
  },
};
