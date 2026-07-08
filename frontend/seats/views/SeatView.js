/* CineTicket - Seat Selection View */
const SeatView = {
  async render(params) {
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

    if (SeatController.currentError) {
      main.innerHTML = `
        <div class="page-wrapper">
          <div class="container">
            <div class="empty-state">
              <i class="fas fa-chair"></i>
              <h3>Suat chieu chua co so do ghe</h3>
              <p>${Helpers.escapeHtml(SeatController.currentError)}</p>
              <button class="btn btn-outline" onclick="Router.navigate('/movies')">Quay lai danh sach phim</button>
            </div>
          </div>
        </div>`;
      return;
    }

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

    const rows = SeatController.currentRows || [];
    if (rows.length === 0) {
      main.innerHTML = `
        <div class="page-wrapper">
          <div class="container">
            <div class="empty-state">
              <i class="fas fa-chair"></i>
              <h3>Suat chieu chua co so do ghe</h3>
              <p>Database chua co ShowtimeSeat cho suat chieu nay.</p>
              <button class="btn btn-outline" onclick="Router.navigate('/movies')">Quay lai danh sach phim</button>
            </div>
          </div>
        </div>`;
      return;
    }
    const numberHeader = this._seatNumberHeader(rows);
    const bestSeatZone = this._bestSeatZone(rows);

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
          <img class="booking-info-poster" src="${movie.poster}" alt="" onerror="this.src=API.moviePosterFallback" />
          <div class="booking-info-details">
            <div class="booking-info-title">${Helpers.escapeHtml(movie.title)}</div>
            <div class="booking-info-meta">
              <span><i class="fas fa-building"></i> ${Helpers.escapeHtml(cinema ? cinema.shortName : '')}</span>
              <span><i class="fas fa-calendar"></i> ${showtime.date}</span>
              <span><i class="fas fa-clock"></i> ${showtime.startTime} - ${showtime.endTime}</span>
            </div>
          </div>
        </div>

        <div class="seats-layout">
          <div>
            <div class="seat-grid-wrap">
              <div class="seat-map-stage">
                <div class="screen-wrap">
                  <div class="screen"></div>
                  <div class="screen-label">Man Hinh</div>
                </div>

                <div class="seat-grid" id="seat-grid">
                  ${this._bestSeatZoneOverlay(bestSeatZone)}
                  ${numberHeader}
                  ${rows.map((row) => `
                    <div class="seat-row">
                      <span class="seat-row-label">${row.label}</span>
                      ${row.seats.map((seat) => this._seatHtml(showtime, seat)).join('')}
                      <span class="seat-row-label">${row.label}</span>
                    </div>`).join('')}
                  ${numberHeader}
                </div>
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
                <img class="summary-poster" src="${movie.poster}" alt="" onerror="this.src=API.moviePosterFallback" />
                <div>
                  <div class="summary-movie-title">${Helpers.escapeHtml(movie.title)}</div>
                  <div class="summary-movie-meta">
                    ${Helpers.escapeHtml(cinema ? cinema.shortName : '')}<br>
                    ${showtime.date} - ${showtime.startTime}
                  </div>
                </div>
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
    const isUnavailable = (seat.isBooked || ['HELD', 'BOOKED', 'BLOCKED'].includes(seat.status)) && !seat.heldByMe;
    const price = seat.price || SeatModel.getPriceForType(showtime, seat.type);
    const label = seat.type === 'vip' ? 'VIP' : seat.type === 'couple' ? 'Doi' : 'Thuong';
    return `<div class="seat ${seat.type} ${isUnavailable ? 'booked' : ''} ${seat.heldByMe ? 'selected' : ''}"
      data-id="${seat.id}"
      data-showtime-seat-id="${seat.showtimeSeatId || seat.id}"
      data-type="${seat.type}"
      data-price="${price}"
      data-booked="${isUnavailable}"
      onclick="SeatView._handleSeatClick(this)"
      title="${seat.id} - ${label} - ${Helpers.formatCurrency(price)}"
    >${Helpers.escapeHtml(seat.label || seat.id)}</div>`;
  },

  _bestSeatZone(rows) {
    const usableRows = rows.filter((row) => row.seats.length > 0);
    if (usableRows.length === 0) return null;

    const zoneRowCount = Math.min(3, usableRows.length);
    const maxCols = Math.max(...usableRows.map((row) => row.seats.length));
    const zoneColCount = Math.min(5, maxCols);
    const rowStart = Math.max(0, Math.round((usableRows.length - zoneRowCount) / 2));
    const rowEnd = rowStart + zoneRowCount - 1;
    const colStart = Math.max(1, Math.round((maxCols - zoneColCount) / 2) + 1);
    const colEnd = colStart + zoneColCount - 1;

    const seatSize = 34;
    const seatGap = 8;
    const rowLabelWidth = 24;
    const numberHeaderHeight = 16;
    const zonePad = 8;

    return {
      rowStart,
      rowEnd,
      colStart,
      colEnd,
      left: rowLabelWidth + seatGap + ((colStart - 1) * (seatSize + seatGap)) - zonePad,
      top: numberHeaderHeight + seatGap + (rowStart * (seatSize + seatGap)) - zonePad,
      width: (zoneColCount * seatSize) + ((zoneColCount - 1) * seatGap) + (zonePad * 2),
      height: (zoneRowCount * seatSize) + ((zoneRowCount - 1) * seatGap) + (zonePad * 2),
    };
  },

  _bestSeatZoneOverlay(zone) {
    if (!zone) return '';

    return `<div class="best-seat-zone"
      aria-hidden="true"
      style="--zone-left:${zone.left}px;--zone-top:${zone.top}px;--zone-width:${zone.width}px;--zone-height:${zone.height}px;"
    ></div>`;
  },

  _seatNumberHeader(rows) {
    const templateRow = rows.reduce((best, row) => {
      if (!best) return row;
      return row.seats.length > best.seats.length ? row : best;
    }, null);
    const maxCol = templateRow ? templateRow.seats.length : 0;

    if (maxCol === 0) return '';

    return `<div class="seat-number-row">
      <span class="seat-row-label"></span>
      ${templateRow.seats.map((seat, idx) => `<span class="seat-number-label ${seat.type === 'couple' ? 'couple' : ''}">${idx + 1}</span>`).join('')}
      <span class="seat-row-label"></span>
    </div>`;
  },

  async _handleSeatClick(el) {
    try {
      const toggled = await SeatController.toggleSeat(
        el.dataset.id,
        el.dataset.type,
        el.dataset.booked === 'true',
        el.dataset.showtimeSeatId,
        el.dataset.price
      );
      if (!toggled) return;
      el.classList.toggle('selected', SeatController.isSelected(el.dataset.id));
      this._updateSummary();
    } catch (error) {
      Toast.error(error.message || 'Khong the giu ghe');
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
