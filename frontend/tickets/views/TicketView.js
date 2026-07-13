/* CRTicket - Ticket View */
const TicketView = {
  render(params) {
    this.renderBackendBooking(params.id);
  },

  async renderBackendTicket(ticketId, providedTicket = null) {
    let ticket = providedTicket || null;
    if (!ticket) {
      try {
        const tickets = await TicketModel.getByUser(API.getBackendUserId());
        ticket = tickets.find((item) => item.id === ticketId);
      } catch (error) {
        Toast.error(error.message || 'Không thể tải vé');
      }
    }

    if (!ticket) {
      Router.notFound();
      return;
    }

    this._renderBackendTickets([ticket], ticket.booking?.qrToken);
  },

  async renderBackendBooking(bookingId, providedTickets = null) {
    let tickets = providedTickets;
    let bookingQrToken = null;
    if (!tickets) {
      try {
        const data = await API.getBookingTickets(bookingId);
        tickets = data.tickets || [];
        bookingQrToken = data.bookingQrToken;
      } catch (error) {
        Toast.error(error.message || 'Không thể tải chi tiết vé');
      }
    }

    if (!tickets || tickets.length === 0) {
      Toast.error('Không tìm thấy vé đã thanh toán cho booking này');
      Router.navigate('/history');
      return;
    }

    this._renderBackendTickets(tickets, bookingQrToken);
  },

  _renderBackendTickets(tickets, providedBookingQrToken = null) {
    document.getElementById('footer').style.display = '';
    const main = document.getElementById('main-content');
    if (!main) return;

    const sortedTickets = [...tickets].sort((a, b) => {
      const rowA = a.seat ? a.seat.row : '';
      const rowB = b.seat ? b.seat.row : '';
      if (rowA !== rowB) return rowA.localeCompare(rowB);
      return (a.seat ? a.seat.number : 0) - (b.seat ? b.seat.number : 0);
    });
    const firstTicket = sortedTickets[0];
    const booking = firstTicket.booking || {};
    const visual = this._movieVisual(firstTicket.movie);
    const seats = sortedTickets
      .map((ticket) => ticket.seat ? `${ticket.seat.row}${ticket.seat.number}` : '')
      .filter(Boolean);
    const bookingQrToken = providedBookingQrToken || booking.qrToken || `CINETICKET:BOOKING:${booking.id}`;
    const qrCode = this._qrCode(bookingQrToken);
    const details = this._ticketSummaryDetails({
      showtime: firstTicket.showtime,
      room: firstTicket.room,
      seats,
      qrCode,
      totalAmount: booking.totalAmount || 0,
      comboItems: booking.comboItems || [],
    });

    main.innerHTML = `
    <div class="ticket-page">
      <div class="container">
        <div class="ticket-page-center">
          <div class="ticket-success-banner">
            <div class="ticket-success-icon"><i class="fas fa-ticket-alt"></i></div>
            <h2 class="ticket-success-title">Chi Tiết Vé</h2>
            <p class="ticket-success-sub">Đưa mã QR này cho nhân viên soát vé để nhận vé vào rạp.</p>
          </div>

          <div class="ticket-card">
            <div class="ticket-header">
              <div class="ticket-backdrop" style="background-image:url('${visual.banner}')"></div>
              <div style="position:absolute;inset:0;background:linear-gradient(to right, rgba(0,0,0,0.86), rgba(0,0,0,0.46));z-index:0;"></div>
              <div class="ticket-header-content">
                <img class="ticket-poster" src="${visual.poster}" alt="" onerror="this.src=API.moviePosterFallback" />
                <div class="ticket-header-info">
                  <div class="ticket-movie-title">${Helpers.escapeHtml(firstTicket.movie ? firstTicket.movie.title : 'CRTicket')}</div>
                  <div class="ticket-cinema-name"><i class="fas fa-map-marker-alt"></i> ${Helpers.escapeHtml(firstTicket.cinema ? firstTicket.cinema.name : '')}</div>
                  <div class="ticket-logo-badge"><i class="fas fa-film"></i> ${booking.id ? booking.id.slice(0, 12).toUpperCase() : 'CRTicket'}</div>
                </div>
              </div>
            </div>

            <div class="ticket-tear"><div class="ticket-tear-line"></div></div>
            ${details}
          </div>

          <div class="ticket-actions">
            <button class="btn btn-primary" onclick="TicketView.printCurrentTicket()"><i class="fas fa-print"></i> In Vé</button>
            <button class="btn btn-outline" onclick="Router.navigate('/history')"><i class="fas fa-ticket-alt"></i> Vé Của Tôi</button>
            <button class="btn btn-outline" onclick="Router.navigate('/')"><i class="fas fa-home"></i> Trang Chủ</button>
          </div>
        </div>
      </div>
    </div>`;
  },

  _ticketSummaryDetails({ showtime, room, seats, qrCode, totalAmount, comboItems = [] }) {
    const startAt = showtime ? new Date(showtime.startAt) : null;
    const endAt = showtime ? new Date(showtime.endAt) : null;
    const dateText = startAt ? Helpers.formatDate(showtime.startAt) : '';
    const timeText = startAt && endAt
      ? `${startAt.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} - ${endAt.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`
      : '';
    const seatText = (seats || []).filter(Boolean).join(', ');
    const comboText = (comboItems || [])
      .filter((item) => item.quantity > 0)
      .map((item) => `${item.name} x${item.quantity}`)
      .join(', ');

    return `
      <div class="ticket-body">
        <div class="ticket-info-grid ticket-info-grid-compact">
          <div class="ticket-info-item">
            <div class="ticket-info-label">Ngày Chiếu</div>
            <div class="ticket-info-value">${dateText}</div>
          </div>
          <div class="ticket-info-item">
            <div class="ticket-info-label">Giờ Chiếu</div>
            <div class="ticket-info-value highlight">${timeText}</div>
          </div>
          <div class="ticket-info-item">
            <div class="ticket-info-label">Phòng</div>
            <div class="ticket-info-value">${room ? Helpers.escapeHtml(room.name) : ''}</div>
          </div>
          <div class="ticket-info-item">
            <div class="ticket-info-label">Số Ghế</div>
            <div class="ticket-info-value">${Helpers.escapeHtml(seatText)}</div>
          </div>
          ${comboText ? `
          <div class="ticket-info-item" style="grid-column:1/-1;">
            <div class="ticket-info-label">Combo Bắp Nước</div>
            <div class="ticket-info-value">${Helpers.escapeHtml(comboText)}</div>
          </div>` : ''}
        </div>
      </div>

      <div class="ticket-tear"><div class="ticket-tear-line"></div></div>

      <div class="ticket-footer ticket-footer-summary">
        <div class="ticket-qr ticket-qr-large">${qrCode}</div>
        <div class="ticket-total">
          <div class="ticket-total-label">Tổng Tiền Đã Thanh Toán</div>
          <div class="ticket-total-amount">${Helpers.formatCurrency(totalAmount || 0)}</div>
          <div class="ticket-footer-note">Đưa mã QR cho nhân viên soát vé để nhận vé vào rạp.</div>
        </div>
      </div>`;
  },

  _movieVisual(movie) {
    const localMovie = movie ? MovieModel.getById(movie.id) : null;
    return {
      poster: localMovie && localMovie.poster ? localMovie.poster : API.moviePosterFallback,
      banner: localMovie && localMovie.banner ? localMovie.banner : API.moviePosterFallback,
    };
  },

  _qrCode(qrToken) {
    if (!qrToken) {
      return '<div class="ticket-qr-placeholder"><i class="fas fa-qrcode"></i></div>';
    }
    try {
      return QR.toSvg(qrToken, { scale: 8, margin: 1 });
    } catch (error) {
      console.warn('Could not render QR:', error);
      return '<div class="ticket-qr-placeholder"><i class="fas fa-qrcode"></i></div>';
    }
  },

  printCurrentTicket() {
    const ticketCard = document.querySelector('.ticket-card');
    if (!ticketCard) return;

    document.body.classList.add('print-ticket-only');
    const cleanup = () => document.body.classList.remove('print-ticket-only');
    window.addEventListener('afterprint', cleanup, { once: true });
    setTimeout(() => {
      window.print();
      setTimeout(cleanup, 500);
    }, 50);
  },
};
