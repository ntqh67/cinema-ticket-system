/**
 * Mục đích: Lớp View dựng giao diện và cập nhật DOM cho miền vé điện tử.
 */
/* CineTicket - View vé */
// Đối tượng TicketView đóng vai trò lớp hiển thị, dựng HTML và cập nhật DOM.
const TicketView = {
  // Dựng phần giao diện tương ứng trong khối render.
  render(params) {
    const booking = TicketController.getTicket(params.id);
    // Kiểm tra trạng thái booking hoặc thanh toán để chọn bước giao diện tiếp theo.
    if (!booking) {
      this.renderBackendBooking(params.id);
      return;
    }
    this._renderBookingTicket(booking);
  },

  // Dựng phần giao diện tương ứng trong khối renderBackendTicket.
  async renderBackendTicket(ticketId, providedTicket = null) {
    let ticket = providedTicket || null;
    // Dừng hoặc đổi hướng luồng khi dữ liệu bắt buộc chưa sẵn sàng.
    if (!ticket) {
      // Bắt đầu thao tác có thể thất bại để hiển thị phản hồi phù hợp cho người dùng.
      try {
        const tickets = await TicketModel.getByUser(API.getBackendUserId());
        ticket = tickets.find((item) => item.id === ticketId);
      } catch (error) {
        Toast.error(error.message || 'Khong the tai ve');
      }
    }

    if (!ticket) {
      Router.notFound();
      return;
    }

    this._renderBackendTicket(ticket);
  },

  // Dựng phần giao diện tương ứng trong khối renderBackendBooking.
  async renderBackendBooking(bookingId, providedTickets = null) {
    let tickets = providedTickets;
    // Dừng hoặc đổi hướng luồng khi dữ liệu bắt buộc chưa sẵn sàng.
    if (!tickets) {
      try {
        const data = await API.getBookingTickets(bookingId);
        tickets = data.tickets || [];
        tickets.bookingQrToken = data.bookingQrToken;
      } catch (error) {
        Toast.error(error.message || 'Khong the tai chi tiet ve');
      }
    }

    // Xử lý riêng trường hợp danh sách rỗng hoặc có số lượng không hợp lệ.
    if (!tickets || tickets.length === 0) {
      Router.notFound();
      return;
    }

    this._renderBackendBooking(tickets);
  },

  // Dựng phần giao diện tương ứng trong khối _renderBackendTicket.
  _renderBackendTicket(ticket) {
    document.getElementById('footer').style.display = '';
    const main = document.getElementById('main-content');
    // Dừng hoặc đổi hướng luồng khi dữ liệu bắt buộc chưa sẵn sàng.
    if (!main) return;

    const visual = Helpers.getMovieVisual(ticket.movie);
    const seatText = ticket.seat ? `${ticket.seat.row}${ticket.seat.number}` : '';
    const bookingQrToken = ticket.booking && ticket.booking.qrToken
      ? ticket.booking.qrToken
      : `CINETICKET:BOOKING:${ticket.booking ? ticket.booking.id : ticket.id}`;
    const qrCode = this._qrCode(bookingQrToken, 'large');
    const details = this._ticketSummaryDetails({
      showtime: ticket.showtime,
      room: ticket.room,
      seats: [seatText],
      qrCode,
      totalAmount: ticket.booking ? ticket.booking.totalAmount : 0,
      comboItems: ticket.booking ? ticket.booking.comboItems || [] : [],
    });

    main.innerHTML = `
    <div class="ticket-page">
      <div class="container">
        <div class="ticket-page-center">
          <div class="ticket-success-banner">
            <div class="ticket-success-icon"><i class="fas fa-check"></i></div>
            <h2 class="ticket-success-title">Đặt Vé Thành Công!</h2>
            <p class="ticket-success-sub">Vé của bạn đã được xác nhận từ backend Booking Service.</p>
          </div>

          <div class="ticket-card">
            <div class="ticket-header">
              <div class="ticket-backdrop" style="background-image:url('${visual.banner}')"></div>
              <div style="position:absolute;inset:0;background:linear-gradient(to right, rgba(0,0,0,0.85), rgba(0,0,0,0.5));z-index:0;"></div>
              <div class="ticket-header-content">
                <img class="ticket-poster" src="${visual.poster}" alt="" onerror="this.src=API.moviePosterFallback" />
                <div class="ticket-header-info">
                  <div class="ticket-movie-title">${Helpers.escapeHtml(ticket.movie ? ticket.movie.title : 'Cinema Ticket')}</div>
                  <div class="ticket-cinema-name"><i class="fas fa-map-marker-alt"></i> ${Helpers.escapeHtml(ticket.cinema ? ticket.cinema.name : '')}</div>
                  <div class="ticket-logo-badge"><i class="fas fa-film"></i> CRTicket</div>
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

  // Dựng phần giao diện tương ứng trong khối _renderBackendBooking.
  _renderBackendBooking(tickets) {
    document.getElementById('footer').style.display = '';
    const main = document.getElementById('main-content');
    if (!main) return;

    const firstTicket = tickets[0];
    const booking = firstTicket.booking || {};
    const bookingQrToken = tickets.bookingQrToken || booking.qrToken || `CINETICKET:BOOKING:${booking.id}`;
    const bookingQrCode = this._qrCode(bookingQrToken, 'large');
    const visual = Helpers.getMovieVisual(firstTicket.movie);
    const sortedTickets = [...tickets].sort((a, b) => {
      const rowA = a.seat ? a.seat.row : '';
      const rowB = b.seat ? b.seat.row : '';
      // Dừng hoặc đổi hướng luồng khi dữ liệu bắt buộc chưa sẵn sàng.
      if (rowA !== rowB) return rowA.localeCompare(rowB);
      return (a.seat ? a.seat.number : 0) - (b.seat ? b.seat.number : 0);
    });
    const seatList = sortedTickets
      .map((ticket) => ticket.seat ? `${ticket.seat.row}${ticket.seat.number}` : '')
      .filter(Boolean);
    const details = this._ticketSummaryDetails({
      showtime: firstTicket.showtime,
      room: firstTicket.room,
      seats: seatList,
      qrCode: bookingQrCode,
      totalAmount: booking.totalAmount || 0,
      comboItems: booking.comboItems || [],
    });

    main.innerHTML = `
    <div class="ticket-page">
      <div class="container">
        <div class="ticket-page-center">
          <div class="ticket-success-banner">
            <div class="ticket-success-icon"><i class="fas fa-ticket-alt"></i></div>
            <h2 class="ticket-success-title">Chi Tiết Đặt Vé</h2>
            <p class="ticket-success-sub">Mã QR này dùng cho toàn bộ ghế trong booking.</p>
          </div>

          <div class="ticket-card">
            <div class="ticket-header">
              <div class="ticket-backdrop" style="background-image:url('${visual.banner}')"></div>
              <div style="position:absolute;inset:0;background:linear-gradient(to right, rgba(0,0,0,0.85), rgba(0,0,0,0.5));z-index:0;"></div>
              <div class="ticket-header-content">
                <img class="ticket-poster" src="${visual.poster}" alt="" onerror="this.src=API.moviePosterFallback" />
                <div class="ticket-header-info">
                  <div class="ticket-movie-title">${Helpers.escapeHtml(firstTicket.movie ? firstTicket.movie.title : 'Cinema Ticket')}</div>
                  <div class="ticket-cinema-name"><i class="fas fa-map-marker-alt"></i> ${Helpers.escapeHtml(firstTicket.cinema ? firstTicket.cinema.name : '')}</div>
                  <div class="ticket-logo-badge"><i class="fas fa-film"></i> ${booking.id ? booking.id.slice(0, 12).toUpperCase() : ''}</div>
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

  // Tính toán giá trị tổng hợp trong khối _ticketSummaryDetails.
  _ticketSummaryDetails({ showtime, room, seats, qrCode, totalAmount, comboItems = [] }) {
    const startAt = showtime ? new Date(showtime.startAt) : null;
    const endAt = showtime ? new Date(showtime.endAt) : null;
    const dateText = startAt ? Helpers.formatDate(showtime.startAt) : '';
    const timeText = startAt && endAt
      ? `${startAt.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} - ${endAt.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`
      : '';
    const seatText = (seats || []).filter(Boolean).join(', ');

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
          ${comboItems.length ? `
          <div class="ticket-info-item">
            <div class="ticket-info-label">Combo</div>
            <div class="ticket-info-value">${Helpers.escapeHtml(comboItems.map((item) => `${item.name} x${item.quantity}`).join(', '))}</div>
          </div>` : ''}
        </div>
      </div>

      <div class="ticket-tear"><div class="ticket-tear-line"></div></div>

      <div class="ticket-footer ticket-footer-summary">
        <div class="ticket-qr ticket-qr-large">${qrCode}</div>
        <div class="ticket-total">
          <div class="ticket-total-label">Tổng Tiền Đã Thanh Toán</div>
          <div class="ticket-total-amount">${Helpers.formatCurrency(totalAmount || 0)}</div>
          <div class="ticket-footer-note">Đưa mã QR cho nhân viên soát vé để nhận vé vào rạp</div>
        </div>
      </div>`;
  },
  // Thực hiện trách nhiệm riêng của khối _qrCode.
  _qrCode(qrToken, size = 'small') {
    // Dừng hoặc đổi hướng luồng khi dữ liệu bắt buộc chưa sẵn sàng.
    if (!qrToken) {
      return '<div class="ticket-qr-placeholder"><i class="fas fa-qrcode"></i></div>';
    }
    // Bắt đầu thao tác có thể thất bại để hiển thị phản hồi phù hợp cho người dùng.
    try {
      return QR.toSvg(qrToken, { scale: size === 'large' ? 7 : 3 });
    } catch (error) {
      console.warn('Could not render QR:', error);
      return '<div class="ticket-qr-placeholder"><i class="fas fa-qrcode"></i></div>';
    }
  },

  // Thực hiện trách nhiệm riêng của khối printCurrentTicket.
  printCurrentTicket() {
    const ticketCard = document.querySelector('.ticket-card');
    // Dừng hoặc đổi hướng luồng khi dữ liệu bắt buộc chưa sẵn sàng.
    if (!ticketCard) return;

    document.body.classList.add('print-ticket-only');
    const cleanup = () => document.body.classList.remove('print-ticket-only');
    window.addEventListener('afterprint', cleanup, { once: true });
    setTimeout(() => {
      window.print();
      setTimeout(cleanup, 500);
    }, 50);
  },

  // Dựng phần giao diện tương ứng trong khối _renderBookingTicket.
  _renderBookingTicket(booking) {
    document.getElementById('footer').style.display = '';
    const movie = MovieModel.getById(booking.movieId);
    const showtime = ShowtimeModel.getById(booking.showtimeId);
    const cinema = showtime ? CinemaModel.getById(showtime.cinemaId) : null;
    const room = showtime ? RoomModel.getById(showtime.roomId) : null;
    const main = document.getElementById('main-content');
    if (!main) return;

    const seatList = (booking.seats || []).map((seat) => typeof seat === 'object' ? seat.id : seat);
    main.innerHTML = `
    <div class="ticket-page">
      <div class="container">
        <div class="ticket-page-center">
          <div class="ticket-success-banner">
            <div class="ticket-success-icon"><i class="fas fa-check"></i></div>
            <h2 class="ticket-success-title">Dat Ve Thanh Cong!</h2>
            <p class="ticket-success-sub">Ve cua ban da duoc xac nhan.</p>
          </div>
          <div class="ticket-card">
            <div class="ticket-header">
              <div class="ticket-backdrop" style="background-image:url('${movie ? movie.banner : ''}')"></div>
              <div style="position:absolute;inset:0;background:linear-gradient(to right, rgba(0,0,0,0.85), rgba(0,0,0,0.5));z-index:0;"></div>
              <div class="ticket-header-content">
                <img class="ticket-poster" src="${movie ? movie.poster : API.moviePosterFallback}" alt="" onerror="this.src=API.moviePosterFallback" />
                <div class="ticket-header-info">
                  <div class="ticket-movie-title">${movie ? Helpers.escapeHtml(movie.title) : ''}</div>
                  <div class="ticket-cinema-name"><i class="fas fa-map-marker-alt"></i> ${cinema ? Helpers.escapeHtml(cinema.name) : ''}</div>
                  <div class="ticket-logo-badge"><i class="fas fa-film"></i> CRTicket</div>
                </div>
              </div>
            </div>
            <div class="ticket-body">
              <div class="ticket-info-grid">
                <div class="ticket-info-item"><div class="ticket-info-label">Ngay Chieu</div><div class="ticket-info-value">${showtime ? showtime.date : ''}</div></div>
                <div class="ticket-info-item"><div class="ticket-info-label">Gio Chieu</div><div class="ticket-info-value highlight">${showtime ? showtime.startTime + ' - ' + showtime.endTime : ''}</div></div>
                <div class="ticket-info-item"><div class="ticket-info-label">Phong</div><div class="ticket-info-value">${room ? Helpers.escapeHtml(room.name) : ''}</div></div>
                <div class="ticket-info-item" style="grid-column:1/-1;"><div class="ticket-info-label">So Ghe</div><div class="ticket-info-value seats">${seatList.map((seat) => `<span class="seat-chip">${seat}</span>`).join('')}</div></div>
              </div>
            </div>
            <div class="ticket-footer">
              <div class="ticket-qr"><div class="ticket-qr-placeholder"><i class="fas fa-qrcode" style="font-size:3rem;color:#222;"></i></div></div>
              <div class="ticket-total"><div class="ticket-total-label">Tong Tien</div><div class="ticket-total-amount">${Helpers.formatCurrency(booking.totalAmount || booking.totalPrice)}</div></div>
            </div>
          </div>
          <div class="ticket-actions">
            <button class="btn btn-primary" onclick="TicketView.printCurrentTicket()"><i class="fas fa-print"></i> In Ve</button>
            <button class="btn btn-outline" onclick="Router.navigate('/history')"><i class="fas fa-ticket-alt"></i> Ve Cua Toi</button>
          </div>
        </div>
      </div>
    </div>`;
  },
};
