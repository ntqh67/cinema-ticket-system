/* CineTicket - Seat Selection View */
const SeatView = {
  async render(params) {
    if (!AuthController.checkAuth()) return;

    const showtimeId = params.id;
    const main = document.getElementById('main-content');
    if (!main) return;

    main.innerHTML = `
      <div class="page-wrapper">
        <div class="container">
          <div class="empty-state">Dang tai so do ghe...</div>
        </div>
      </div>`;

    await SeatController.init(showtimeId);

    const showtime = SeatController.currentShowtime;
    if (!showtime) {
      Router.notFound();
      return;
    }

    const movie = MovieModel.getById(showtime.movieId);
    const cinema = CinemaModel.getById(showtime.cinemaId);
    const room = SeatController.currentRoom;
    if (!movie || !room) {
      Router.notFound();
      return;
    }

    document.getElementById('footer').style.display = '';

    const bookedSeats = SeatModel.getBookedSeats(showtimeId);
    const rows = SeatController.currentRows || SeatModel.generateSeats(room, bookedSeats);

    main.innerHTML = `
    <div class="seats-page">
      <div class="container">
        <div class="booking-steps">
          <div class="booking-step done"><div class="booking-step-num"><i class="fas fa-check"></i></div><span class="booking-step-label">Chon Phim</span></div>
          <div class="booking-step-divider"></div>
          <div class="booking-step active"><div class="booking-step-num">2</div><span class="booking-step-label">Chon Ghe</span></div>
          <div class="booking-step-divider"></div>
          <div class="booking-step"><div class="booking-step-num">3</div><span class="booking-step-label">Thanh Toan</span></div>
          <div class="booking-step-divider"></div>
          <div class="booking-step"><div class="booking-step-num">4</div><span class="booking-step-label">Ve Cua Ban</span></div>
        </div>

        <div class="booking-info-bar">
          <img class="booking-info-poster" src="${movie.poster}" alt="" onerror="this.src='https://picsum.photos/48/64?grayscale'" />
          <div class="booking-info-details">
            <div class="booking-info-title">${Helpers.escapeHtml(movie.title)}</div>
            <div class="booking-info-meta">
              <span><i class="fas fa-building"></i> ${Helpers.escapeHtml(cinema ? cinema.shortName : '')}</span>
              <span><i class="fas fa-door-open"></i> ${Helpers.escapeHtml(room.name)}</span>
              <span><i class="fas fa-calendar"></i> ${showtime.date}</span>
              <span><i class="fas fa-clock"></i> ${showtime.startTime} - ${showtime.endTime}</span>
            </div>
          </div>
        </div>

        <div class="seats-layout">
          <div>
            <div class="screen-wrap">
              <div class="screen"></div>
              <div class="screen-label">Man Hinh</div>
            </div>

            <div class="seat-grid-wrap">
              <div class="seat-grid" id="seat-grid">
                ${rows.map((row) => `
                  <div class="seat-row">
                    <span class="seat-row-label">${row.label}</span>
                    ${row.seats.map((seat) => this._seatHtml(showtime, seat)).join('')}
                    <span class="seat-row-label">${row.label}</span>
                  </div>`).join('')}
              </div>
            </div>

            <div class="seat-legend">
              <div class="legend-item"><div class="legend-box normal"></div><span>Thuong - ${Helpers.formatCurrency(showtime.price.normal)}</span></div>
              <div class="legend-item"><div class="legend-box vip"></div><span>VIP - ${Helpers.formatCurrency(showtime.price.vip)}</span></div>
              <div class="legend-item"><div class="legend-box couple"></div><span>Doi - ${Helpers.formatCurrency(showtime.price.couple)}</span></div>
              <div class="legend-item"><div class="legend-box selected"></div><span>Dang chon</span></div>
              <div class="legend-item"><div class="legend-box booked"></div><span>Da dat / dang giu</span></div>
            </div>
          </div>

          <div class="booking-summary-panel">
            <div class="booking-summary-header"><i class="fas fa-ticket-alt"></i> Thong Tin Dat Ve</div>
            <div class="booking-summary-body">
              <div class="summary-movie-mini">
                <img class="summary-poster" src="${movie.poster}" alt="" onerror="this.src='https://picsum.photos/56/76?grayscale'" />
                <div>
                  <div class="summary-movie-title">${Helpers.escapeHtml(movie.title)}</div>
                  <div class="summary-movie-meta">
                    ${Helpers.escapeHtml(cinema ? cinema.shortName : '')}<br>
                    ${showtime.date} - ${showtime.startTime}
                  </div>
                </div>
              </div>
              <div class="summary-row">
                <span class="summary-label">Phong</span>
                <span class="summary-value">${Helpers.escapeHtml(room.name)}</span>
              </div>
              <div class="summary-row" style="flex-direction:column;align-items:flex-start;gap:8px;">
                <span class="summary-label">Ghe da chon</span>
                <div class="summary-seats-list" id="summary-seats-list">
                  <span style="color:var(--color-text-dim);font-size:0.85rem;">Chua chon ghe</span>
                </div>
              </div>
              <div class="summary-divider"></div>
              <div class="summary-total">
                <span>Tong Tien</span>
                <span class="summary-total-amount" id="summary-total">0</span>
              </div>
            </div>
            <div class="booking-summary-footer">
              <button class="btn btn-primary btn-block btn-lg" onclick="SeatController.proceedToPayment()" id="proceed-btn" disabled>
                <i class="fas fa-arrow-right"></i> Tiep Tuc
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>`;
  },

  _seatHtml(showtime, seat) {
    const isUnavailable = seat.isBooked || ['HELD', 'BOOKED', 'BLOCKED'].includes(seat.status);
    const price = seat.price || SeatModel.getPriceForType(showtime, seat.type);
    const label = seat.type === 'vip' ? 'VIP' : seat.type === 'couple' ? 'Doi' : 'Thuong';
    return `<div class="seat ${seat.type} ${isUnavailable ? 'booked' : ''}"
      data-id="${seat.id}"
      data-showtime-seat-id="${seat.showtimeSeatId || seat.id}"
      data-type="${seat.type}"
      data-price="${price}"
      data-booked="${isUnavailable}"
      onclick="SeatView._handleSeatClick(this)"
      title="${seat.id} - ${label} - ${Helpers.formatCurrency(price)}"
    >${seat.type === 'couple' ? seat.id : ''}</div>`;
  },

  _handleSeatClick(el) {
    const toggled = SeatController.toggleSeat(
      el.dataset.id,
      el.dataset.type,
      el.dataset.booked === 'true',
      el.dataset.showtimeSeatId,
      el.dataset.price
    );
    if (toggled) {
      el.classList.toggle('selected', SeatController.isSelected(el.dataset.id));
      this._updateSummary();
    }
  },

  _updateSummary() {
    const seats = SeatController.selectedSeats;
    const total = SeatController.getTotalPrice();
    const listEl = document.getElementById('summary-seats-list');
    const totalEl = document.getElementById('summary-total');
    const btn = document.getElementById('proceed-btn');

    if (listEl) {
      if (seats.length === 0) {
        listEl.innerHTML = '<span style="color:var(--color-text-dim);font-size:0.85rem;">Chua chon ghe</span>';
      } else {
        listEl.innerHTML = seats.map((seat) => `<span class="summary-seat-tag">${seat.id}</span>`).join('');
      }
    }
    if (totalEl) totalEl.textContent = Helpers.formatCurrency(total);
    if (btn) btn.disabled = seats.length === 0;
  },
};
