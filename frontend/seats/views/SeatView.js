/* CineTicket - Seat Selection View */
const SeatView = {
  render(params) {
    if (!AuthController.checkAuth()) return;
    const showtimeId = params.id;
    SeatController.init(showtimeId);
    const showtime = SeatController.currentShowtime;
    if (!showtime) { Router.notFound(); return; }
    const movie = MovieModel.getById(showtime.movieId);
    const cinema = CinemaModel.getById(showtime.cinemaId);
    const room = SeatController.currentRoom;
    if (!movie || !room) { Router.notFound(); return; }
    document.getElementById('footer').style.display = '';
    const main = document.getElementById('main-content');
    if (!main) return;

    const bookedSeats = SeatModel.getBookedSeats(showtimeId);
    const rows = SeatModel.generateSeats(room, bookedSeats);

    main.innerHTML = `
    <div class="seats-page">
      <div class="container">
        <!-- Steps -->
        <div class="booking-steps">
          <div class="booking-step done"><div class="booking-step-num"><i class="fas fa-check"></i></div><span class="booking-step-label">Chọn Phim</span></div>
          <div class="booking-step-divider"></div>
          <div class="booking-step active"><div class="booking-step-num">2</div><span class="booking-step-label">Chọn Ghế</span></div>
          <div class="booking-step-divider"></div>
          <div class="booking-step"><div class="booking-step-num">3</div><span class="booking-step-label">Thanh Toán</span></div>
          <div class="booking-step-divider"></div>
          <div class="booking-step"><div class="booking-step-num">4</div><span class="booking-step-label">Vé Của Bạn</span></div>
        </div>

        <!-- Info Bar -->
        <div class="booking-info-bar">
          <img class="booking-info-poster" src="${movie.poster}" alt="" onerror="this.src='https://picsum.photos/48/64?grayscale'" />
          <div class="booking-info-details">
            <div class="booking-info-title">${Helpers.escapeHtml(movie.title)}</div>
            <div class="booking-info-meta">
              <span><i class="fas fa-building"></i> ${Helpers.escapeHtml(cinema ? cinema.shortName : '')}</span>
              <span><i class="fas fa-door-open"></i> ${Helpers.escapeHtml(room.name)}</span>
              <span><i class="fas fa-calendar"></i> ${showtime.date}</span>
              <span><i class="fas fa-clock"></i> ${showtime.startTime} – ${showtime.endTime}</span>
            </div>
          </div>
        </div>

        <!-- Main Layout -->
        <div class="seats-layout">
          <!-- Left: Seat Grid -->
          <div>
            <!-- Screen -->
            <div class="screen-wrap">
              <div class="screen"></div>
              <div class="screen-label">Màn Hình</div>
            </div>

            <!-- Seat Grid -->
            <div class="seat-grid-wrap">
              <div class="seat-grid" id="seat-grid">
                ${rows.map(row => `
                  <div class="seat-row">
                    <span class="seat-row-label">${row.label}</span>
                    ${row.seats.map(seat => {
                      if (seat.type === 'couple') {
                        return `<div class="seat couple ${seat.isBooked ? 'booked' : ''}"
                          data-id="${seat.id}" data-type="couple" data-booked="${seat.isBooked}"
                          onclick="SeatView._handleSeatClick(this)"
                          title="${seat.id} - Đôi - ${Helpers.formatCurrency(SeatModel.getPriceForType(showtime, 'couple'))}"
                        >${seat.id}</div>`;
                      }
                      return `<div class="seat ${seat.type} ${seat.isBooked ? 'booked' : ''}"
                        data-id="${seat.id}" data-type="${seat.type}" data-booked="${seat.isBooked}"
                        onclick="SeatView._handleSeatClick(this)"
                        title="${seat.id} - ${seat.type === 'vip' ? 'VIP' : 'Thường'} - ${Helpers.formatCurrency(SeatModel.getPriceForType(showtime, seat.type))}"
                      ></div>`;
                    }).join('')}
                    <span class="seat-row-label">${row.label}</span>
                  </div>`).join('')}
              </div>
            </div>

            <!-- Legend -->
            <div class="seat-legend">
              <div class="legend-item"><div class="legend-box normal"></div><span>Thường - ${Helpers.formatCurrency(showtime.price.normal)}</span></div>
              <div class="legend-item"><div class="legend-box vip"></div><span>VIP - ${Helpers.formatCurrency(showtime.price.vip)}</span></div>
              <div class="legend-item"><div class="legend-box couple"></div><span>Đôi - ${Helpers.formatCurrency(showtime.price.couple)}</span></div>
              <div class="legend-item"><div class="legend-box selected"></div><span>Đang chọn</span></div>
              <div class="legend-item"><div class="legend-box booked"></div><span>Đã đặt</span></div>
            </div>
          </div>

          <!-- Right: Summary Panel -->
          <div class="booking-summary-panel">
            <div class="booking-summary-header"><i class="fas fa-ticket-alt"></i> Thông Tin Đặt Vé</div>
            <div class="booking-summary-body">
              <div class="summary-movie-mini">
                <img class="summary-poster" src="${movie.poster}" alt="" onerror="this.src='https://picsum.photos/56/76?grayscale'" />
                <div>
                  <div class="summary-movie-title">${Helpers.escapeHtml(movie.title)}</div>
                  <div class="summary-movie-meta">
                    ${Helpers.escapeHtml(cinema ? cinema.shortName : '')}<br>
                    ${showtime.date} · ${showtime.startTime}
                  </div>
                </div>
              </div>
              <div class="summary-row">
                <span class="summary-label">Phòng</span>
                <span class="summary-value">${Helpers.escapeHtml(room.name)}</span>
              </div>
              <div class="summary-row" style="flex-direction:column;align-items:flex-start;gap:8px;">
                <span class="summary-label">Ghế đã chọn</span>
                <div class="summary-seats-list" id="summary-seats-list">
                  <span style="color:var(--color-text-dim);font-size:0.85rem;">Chưa chọn ghế</span>
                </div>
              </div>
              <div class="summary-divider"></div>
              <div class="summary-total">
                <span>Tổng Tiền</span>
                <span class="summary-total-amount" id="summary-total">0 ₫</span>
              </div>
            </div>
            <div class="booking-summary-footer">
              <button class="btn btn-primary btn-block btn-lg" onclick="SeatController.proceedToPayment()" id="proceed-btn" disabled>
                <i class="fas fa-arrow-right"></i> Tiếp Tục
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>`;
  },

  _handleSeatClick(el) {
    const seatId = el.dataset.id;
    const type = el.dataset.type;
    const isBooked = el.dataset.booked === 'true';
    const toggled = SeatController.toggleSeat(seatId, type, isBooked);
    if (toggled) {
      el.classList.toggle('selected', SeatController.isSelected(seatId));
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
        listEl.innerHTML = '<span style="color:var(--color-text-dim);font-size:0.85rem;">Chưa chọn ghế</span>';
      } else {
        listEl.innerHTML = seats.map(s => `<span class="summary-seat-tag">${s.id}</span>`).join('');
      }
    }
    if (totalEl) totalEl.textContent = Helpers.formatCurrency(total);
    if (btn) btn.disabled = seats.length === 0;
  }
};
