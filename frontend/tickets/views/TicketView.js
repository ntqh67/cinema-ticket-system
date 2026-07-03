/* CineTicket - Ticket View */
const TicketView = {
  render(params) {
    const booking = TicketController.getTicket(params.id);
    if (!booking) {
      const cachedTicket = API.getCachedTicket(params.id);
      if (cachedTicket) {
        this.renderBackendTicket(params.id, cachedTicket);
        return;
      }
      Router.notFound();
      return;
    }
    this._renderBookingTicket(booking);
  },

  async renderBackendTicket(ticketId, providedTicket = null) {
    let ticket = providedTicket || API.getCachedTicket(ticketId);
    if (!ticket) {
      try {
        const tickets = await TicketModel.getByUser(API.getBackendUserId());
        API._cacheTickets(tickets);
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

  _renderBackendTicket(ticket) {
    document.getElementById('footer').style.display = '';
    const main = document.getElementById('main-content');
    if (!main) return;

    const seatText = ticket.seat ? `${ticket.seat.row}${ticket.seat.number}` : '';
    const startAt = ticket.showtime ? new Date(ticket.showtime.startAt) : null;
    const endAt = ticket.showtime ? new Date(ticket.showtime.endAt) : null;
    const dateText = startAt ? Helpers.formatDate(ticket.showtime.startAt) : '';
    const timeText = startAt && endAt
      ? `${startAt.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} - ${endAt.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`
      : '';

    main.innerHTML = `
    <div class="ticket-page">
      <div class="container">
        <div class="ticket-page-center">
          <div class="ticket-success-banner">
            <div class="ticket-success-icon"><i class="fas fa-check"></i></div>
            <h2 class="ticket-success-title">Dat Ve Thanh Cong!</h2>
            <p class="ticket-success-sub">Ve cua ban da duoc xac nhan tu backend Booking Service.</p>
          </div>

          <div class="ticket-card">
            <div class="ticket-header">
              <div class="ticket-backdrop" style="background-image:url('https://picsum.photos/seed/${ticket.id}/900/360')"></div>
              <div style="position:absolute;inset:0;background:linear-gradient(to right, rgba(0,0,0,0.85), rgba(0,0,0,0.5));z-index:0;"></div>
              <div class="ticket-header-content">
                <img class="ticket-poster" src="https://picsum.photos/seed/poster-${ticket.id}/80/110" alt="" onerror="this.src='https://picsum.photos/80/110?grayscale'" />
                <div class="ticket-header-info">
                  <div class="ticket-movie-title">${Helpers.escapeHtml(ticket.movie ? ticket.movie.title : 'Cinema Ticket')}</div>
                  <div class="ticket-cinema-name"><i class="fas fa-map-marker-alt"></i> ${Helpers.escapeHtml(ticket.cinema ? ticket.cinema.name : '')}</div>
                  <div class="ticket-logo-badge"><i class="fas fa-film"></i> CineTicket</div>
                </div>
              </div>
            </div>

            <div class="ticket-tear"><div class="ticket-tear-line"></div></div>

            <div class="ticket-body">
              <div class="ticket-info-grid">
                <div class="ticket-info-item">
                  <div class="ticket-info-label">Ngay Chieu</div>
                  <div class="ticket-info-value">${dateText}</div>
                </div>
                <div class="ticket-info-item">
                  <div class="ticket-info-label">Gio Chieu</div>
                  <div class="ticket-info-value highlight">${timeText}</div>
                </div>
                <div class="ticket-info-item">
                  <div class="ticket-info-label">Phong</div>
                  <div class="ticket-info-value">${ticket.room ? Helpers.escapeHtml(ticket.room.name) : ''}</div>
                </div>
                <div class="ticket-info-item">
                  <div class="ticket-info-label">Loai Ve</div>
                  <div class="ticket-info-value">${ticket.seat ? ticket.seat.type : 'STANDARD'}</div>
                </div>
                <div class="ticket-info-item" style="grid-column:1/-1;">
                  <div class="ticket-info-label">So Ghe</div>
                  <div class="ticket-info-value seats"><span class="seat-chip">${seatText}</span></div>
                </div>
                <div class="ticket-info-item">
                  <div class="ticket-info-label">Trang Thai</div>
                  <div class="ticket-info-value">${ticket.status}</div>
                </div>
                <div class="ticket-info-item">
                  <div class="ticket-info-label">Thanh Toan</div>
                  <div class="ticket-info-value">${ticket.booking ? ticket.booking.status : 'PAID'}</div>
                </div>
              </div>
            </div>

            <div class="ticket-tear"><div class="ticket-tear-line"></div></div>

            <div class="ticket-footer">
              <div class="ticket-qr">
                <div class="ticket-qr-placeholder"><i class="fas fa-qrcode" style="font-size:3rem;color:#222;"></i></div>
              </div>
              <div class="ticket-footer-info">
                <div class="ticket-booking-id">Ma QR: <span>${Helpers.escapeHtml(ticket.qrToken || '')}</span></div>
                <div class="ticket-footer-note">Xuat trinh ma QR nay tai quay soat ve.</div>
              </div>
              <div class="ticket-total">
                <div class="ticket-total-label">Tong Tien</div>
                <div class="ticket-total-amount">${Helpers.formatCurrency(ticket.booking ? ticket.booking.totalAmount : 0)}</div>
              </div>
            </div>
          </div>

          <div class="ticket-actions">
            <button class="btn btn-primary" onclick="window.print()"><i class="fas fa-print"></i> In Ve</button>
            <button class="btn btn-outline" onclick="Router.navigate('/history')"><i class="fas fa-ticket-alt"></i> Ve Cua Toi</button>
            <button class="btn btn-outline" onclick="Router.navigate('/')"><i class="fas fa-home"></i> Trang Chu</button>
          </div>
        </div>
      </div>
    </div>`;
  },

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
                <img class="ticket-poster" src="${movie ? movie.poster : ''}" alt="" onerror="this.src='https://picsum.photos/80/110?grayscale'" />
                <div class="ticket-header-info">
                  <div class="ticket-movie-title">${movie ? Helpers.escapeHtml(movie.title) : ''}</div>
                  <div class="ticket-cinema-name"><i class="fas fa-map-marker-alt"></i> ${cinema ? Helpers.escapeHtml(cinema.name) : ''}</div>
                  <div class="ticket-logo-badge"><i class="fas fa-film"></i> CineTicket</div>
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
              <div class="ticket-footer-info"><div class="ticket-booking-id">Ma Dat Ve: <span>${booking.id.toUpperCase().slice(0, 12)}</span></div></div>
              <div class="ticket-total"><div class="ticket-total-label">Tong Tien</div><div class="ticket-total-amount">${Helpers.formatCurrency(booking.totalAmount || booking.totalPrice)}</div></div>
            </div>
          </div>
          <div class="ticket-actions">
            <button class="btn btn-primary" onclick="window.print()"><i class="fas fa-print"></i> In Ve</button>
            <button class="btn btn-outline" onclick="Router.navigate('/history')"><i class="fas fa-ticket-alt"></i> Ve Cua Toi</button>
          </div>
        </div>
      </div>
    </div>`;
  },
};
