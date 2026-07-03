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

  async renderBackendBooking(bookingId, providedTickets = null) {
    let tickets = providedTickets;
    if (!tickets) {
      try {
        const allTickets = await TicketModel.getByUser(API.getBackendUserId());
        API._cacheTickets(allTickets);
        tickets = allTickets.filter((ticket) => ticket.booking && ticket.booking.id === bookingId);
      } catch (error) {
        Toast.error(error.message || 'Khong the tai chi tiet ve');
      }
    }

    if (!tickets || tickets.length === 0) {
      Router.notFound();
      return;
    }

    this._renderBackendBooking(tickets);
  },

  _renderBackendTicket(ticket) {
    document.getElementById('footer').style.display = '';
    const main = document.getElementById('main-content');
    if (!main) return;

    const visual = this._movieVisual(ticket.movie);
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
              <div class="ticket-backdrop" style="background-image:url('${visual.banner}')"></div>
              <div style="position:absolute;inset:0;background:linear-gradient(to right, rgba(0,0,0,0.85), rgba(0,0,0,0.5));z-index:0;"></div>
              <div class="ticket-header-content">
                <img class="ticket-poster" src="${visual.poster}" alt="" onerror="this.src='https://picsum.photos/seed/movie-${ticket.movie ? ticket.movie.id : ticket.id}/80/110'" />
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

  _renderBackendBooking(tickets) {
    document.getElementById('footer').style.display = '';
    const main = document.getElementById('main-content');
    if (!main) return;

    const firstTicket = tickets[0];
    const booking = firstTicket.booking || {};
    const visual = this._movieVisual(firstTicket.movie);
    const sortedTickets = [...tickets].sort((a, b) => {
      const rowA = a.seat ? a.seat.row : '';
      const rowB = b.seat ? b.seat.row : '';
      if (rowA !== rowB) return rowA.localeCompare(rowB);
      return (a.seat ? a.seat.number : 0) - (b.seat ? b.seat.number : 0);
    });
    const startAt = firstTicket.showtime ? new Date(firstTicket.showtime.startAt) : null;
    const endAt = firstTicket.showtime ? new Date(firstTicket.showtime.endAt) : null;
    const dateText = startAt ? Helpers.formatDate(firstTicket.showtime.startAt) : '';
    const timeText = startAt && endAt
      ? `${startAt.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} - ${endAt.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`
      : '';
    const seatChips = sortedTickets
      .map((ticket) => ticket.seat ? `<span class="seat-chip">${ticket.seat.row}${ticket.seat.number}</span>` : '')
      .join('');
    const ticketRows = sortedTickets.map((ticket) => {
      const seatText = ticket.seat ? `${ticket.seat.row}${ticket.seat.number}` : '';
      return `<tr>
        <td><span class="seat-chip">${seatText}</span></td>
        <td>${ticket.seat ? ticket.seat.type : 'STANDARD'}</td>
        <td><span class="badge badge-success">${ticket.status}</span></td>
        <td><code style="font-size:0.75rem;">${Helpers.escapeHtml(ticket.qrToken || '')}</code></td>
      </tr>`;
    }).join('');

    main.innerHTML = `
    <div class="ticket-page">
      <div class="container">
        <div class="ticket-page-center">
          <div class="ticket-success-banner">
            <div class="ticket-success-icon"><i class="fas fa-ticket-alt"></i></div>
            <h2 class="ticket-success-title">Chi Tiet Dat Ve</h2>
            <p class="ticket-success-sub">Tat ca ve trong cung mot booking duoc gom tai day.</p>
          </div>

          <div class="ticket-card">
            <div class="ticket-header">
              <div class="ticket-backdrop" style="background-image:url('${visual.banner}')"></div>
              <div style="position:absolute;inset:0;background:linear-gradient(to right, rgba(0,0,0,0.85), rgba(0,0,0,0.5));z-index:0;"></div>
              <div class="ticket-header-content">
                <img class="ticket-poster" src="${visual.poster}" alt="" onerror="this.src='https://picsum.photos/seed/movie-${firstTicket.movie ? firstTicket.movie.id : booking.id}/80/110'" />
                <div class="ticket-header-info">
                  <div class="ticket-movie-title">${Helpers.escapeHtml(firstTicket.movie ? firstTicket.movie.title : 'Cinema Ticket')}</div>
                  <div class="ticket-cinema-name"><i class="fas fa-map-marker-alt"></i> ${Helpers.escapeHtml(firstTicket.cinema ? firstTicket.cinema.name : '')}</div>
                  <div class="ticket-logo-badge"><i class="fas fa-film"></i> ${booking.id ? booking.id.slice(0, 12).toUpperCase() : ''}</div>
                </div>
              </div>
            </div>

            <div class="ticket-body">
              <div class="ticket-info-grid">
                <div class="ticket-info-item"><div class="ticket-info-label">Ngay Chieu</div><div class="ticket-info-value">${dateText}</div></div>
                <div class="ticket-info-item"><div class="ticket-info-label">Gio Chieu</div><div class="ticket-info-value highlight">${timeText}</div></div>
                <div class="ticket-info-item"><div class="ticket-info-label">Phong</div><div class="ticket-info-value">${firstTicket.room ? Helpers.escapeHtml(firstTicket.room.name) : ''}</div></div>
                <div class="ticket-info-item"><div class="ticket-info-label">So Ve</div><div class="ticket-info-value">${sortedTickets.length}</div></div>
                <div class="ticket-info-item" style="grid-column:1/-1;"><div class="ticket-info-label">So Ghe</div><div class="ticket-info-value seats">${seatChips}</div></div>
              </div>
              <div class="table-wrapper" style="margin-top:24px;">
                <table class="data-table">
                  <thead><tr><th>Ghe</th><th>Loai Ghe</th><th>Trang Thai</th><th>Ma QR</th></tr></thead>
                  <tbody>${ticketRows}</tbody>
                </table>
              </div>
            </div>

            <div class="ticket-footer">
              <div class="ticket-footer-info">
                <div class="ticket-booking-id">Ma Dat Ve: <span>${booking.id ? booking.id.toUpperCase().slice(0, 12) : ''}</span></div>
                <div class="ticket-footer-note">Xuat trinh QR tuong ung voi tung ghe tai quay soat ve.</div>
              </div>
              <div class="ticket-total">
                <div class="ticket-total-label">Tong Tien</div>
                <div class="ticket-total-amount">${Helpers.formatCurrency(booking.totalAmount || 0)}</div>
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

  _movieVisual(movie) {
    const movieId = movie ? movie.id : 'unknown';
    const localMovie = movie ? MovieModel.getById(movie.id) : null;
    return {
      poster: localMovie && localMovie.poster ? localMovie.poster : `https://picsum.photos/seed/movie-${movieId}/400/600`,
      banner: localMovie && localMovie.banner ? localMovie.banner : `https://picsum.photos/seed/movie-${movieId}-banner/1280/720`,
    };
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
