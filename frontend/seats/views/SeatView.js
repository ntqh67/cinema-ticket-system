/* CineTicket - Seat Selection View */
const SeatView = {
  async render(params) {
    const showtimeId = params.id;
    const main = document.getElementById('main-content');
    if (!main) return;

    main.innerHTML = `
      <div class="page-wrapper">
        <div class="container">
          <div class="empty-state">Đang tải sơ đồ ghế...</div>
        </div>
      </div>`;

    await SeatController.init(showtimeId);

    if (SeatController.currentError) {
      main.innerHTML = `
        <div class="page-wrapper">
          <div class="container">
            <div class="empty-state">
              <i class="fas fa-chair"></i>
              <h3>Suất chiếu chưa có sơ đồ ghế</h3>
              <p>${Helpers.escapeHtml(SeatController.currentError)}</p>
              <button class="btn btn-outline" onclick="Router.navigate('/movies')">Quay lại danh sách phim</button>
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

    const accepted = await this._ensureAgeWarningAccepted(movie, showtimeId);
    if (!accepted) {
      Router.navigate(`/movies/${movie.id}`);
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
              <h3>Suất chiếu chưa có sơ đồ ghế</h3>
              <p>Database chưa có ShowtimeSeat cho suất chiếu này.</p>
              <button class="btn btn-outline" onclick="Router.navigate('/movies')">Quay lại danh sách phim</button>
            </div>
          </div>
        </div>`;
      return;
    }
    const maxPosition = this._maxPosition(rows);

    main.innerHTML = `
    <div class="seats-page">
      <div class="container">
        <div class="booking-steps">
          <div class="booking-step done"><div class="booking-step-num"><i class="fas fa-check"></i></div><span class="booking-step-label">Chọn Phim</span></div>
          <div class="booking-step-divider"></div>
          <div class="booking-step active"><div class="booking-step-num">2</div><span class="booking-step-label">Chọn Ghế</span></div>
          <div class="booking-step-divider"></div>
          <div class="booking-step"><div class="booking-step-num">3</div><span class="booking-step-label">Thanh Toán</span></div>
          <div class="booking-step-divider"></div>
          <div class="booking-step"><div class="booking-step-num">4</div><span class="booking-step-label">Vé Của Bạn</span></div>
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

                <div class="seat-grid" id="seat-grid" style="--seat-columns:${maxPosition}">
                  ${rows.map((row) => `
                    <div class="seat-row">
                      <span class="seat-row-label">${row.label}</span>
                      ${row.seats.map((seat) => this._seatHtml(showtime, seat)).join('')}
                      <span class="seat-row-label">${row.label}</span>
                    </div>`).join('')}
                </div>
              </div>
            </div>

            <div class="seat-legend">
              <div class="legend-item"><div class="legend-box normal"></div><span>Thường - ${Helpers.formatCurrency(showtime.price.normal)}</span></div>
              <div class="legend-item"><div class="legend-box couple"></div><span>Đôi - ${Helpers.formatCurrency(showtime.price.couple)}</span></div>
              <div class="legend-item"><div class="legend-box selected"></div><span>Đang chọn</span></div>
              <div class="legend-item"><div class="legend-box booked"></div><span>Đã đặt / đang giữ</span></div>
            </div>
          </div>

          <div class="booking-summary-panel">
            <div class="booking-summary-header"><i class="fas fa-ticket-alt"></i> Thông Tin Đặt Vé</div>
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
                <span class="summary-label">Ghế đã chọn</span>
                <div class="summary-seats-list" id="summary-seats-list">
                  <span style="color:var(--color-text-dim);font-size:0.85rem;">Chưa chọn ghế</span>
                </div>
              </div>
              <div class="summary-divider"></div>
              <div class="summary-total">
                <span>Tổng Tiền</span>
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
    const label = seat.type === 'couple' ? 'Đôi' : 'Thường';
    return `<button type="button" class="seat ${seat.type} ${isUnavailable ? 'booked' : ''} ${seat.heldByMe ? 'selected' : ''}"
      style="--seat-position:${seat.position || seat.col}"
      data-id="${seat.id}"
      data-showtime-seat-id="${seat.showtimeSeatId || seat.id}"
      data-type="${seat.type}"
      data-price="${price}"
      data-booked="${isUnavailable}"
      onclick="SeatView._handleSeatClick(this)"
      title="Ghế ${seat.id} - ${label}"
      ${isUnavailable ? 'disabled' : ''}
    >${seat.col}</button>`;
  },

  _maxPosition(rows) {
    return Math.max(1, ...rows.flatMap((row) => row.seats.map((seat) => {
      const width = seat.type === 'couple' ? 2 : 1;
      return Number(seat.position || seat.col) + width - 1;
    })));
  },

  _ageWarningMessage(ageRating) {
    const warnings = {
      C13: 'Phim dành cho khán giả từ 13 tuổi trở lên.',
      C16: 'Phim dành cho khán giả từ 16 tuổi trở lên.',
      C18: 'Phim dành cho khán giả từ 18 tuổi trở lên.',
    };
    return warnings[ageRating] || '';
  },

  _ensureAgeWarningAccepted(movie, showtimeId) {
    const message = this._ageWarningMessage(movie.ageRating);
    if (!message) return Promise.resolve(true);

    return new Promise((resolve) => {
      const content = `
        <div class="age-warning-modal">
          <p>Theo quy định của Bộ Văn Hóa, Thể Thao và Du Lịch:</p>
          <p>
            Rạp phim không được phép phục vụ khách hàng
            <strong>${Helpers.escapeHtml(this._ageRestrictionText(movie.ageRating))}</strong>
            cho các suất chiếu phim phân loại
            <strong>${Helpers.escapeHtml(movie.ageRating)}</strong>.
            Rạp sẽ không hoàn tiền nếu người xem không đáp ứng đủ điều kiện.
          </p>
          <p class="age-warning-movie">
            <span>Phim:</span> <strong>${Helpers.escapeHtml(movie.title)}</strong>
          </p>
          <button class="age-warning-accept" onclick="SeatView._acceptAgeWarning('${Helpers.escapeHtml(showtimeId)}')">
            Tôi đã hiểu và đồng ý
          </button>
        </div>`;

      this._ageWarningResolver = resolve;
      Modal.show('Lưu ý', content, {
        size: 'sm',
        className: 'age-warning-box',
        buttons: [],
        hideFooter: true,
        onClose: () => {
          if (this._ageWarningResolver) {
            this._ageWarningResolver(false);
            this._ageWarningResolver = null;
          }
        },
      });
    });
  },

  _ageRestrictionText(ageRating) {
    const text = {
      C13: 'dưới 13 tuổi',
      C16: 'dưới 16 tuổi',
      C18: 'dưới 18 tuổi',
    };
    return text[ageRating] || 'không đáp ứng phân loại độ tuổi';
  },

  _acceptAgeWarning(showtimeId) {
    if (this._ageWarningResolver) {
      this._ageWarningResolver(true);
      this._ageWarningResolver = null;
    }
    Modal.close();
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
      Toast.error(error.message || 'Không thể giữ ghế');
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
        listEl.innerHTML = seats.map((seat) => `<span class="summary-seat-tag">${seat.id}</span>`).join('');
      }
    }
    if (totalEl) totalEl.textContent = Helpers.formatCurrency(total);
    if (btn) btn.disabled = seats.length === 0;
  },
};
