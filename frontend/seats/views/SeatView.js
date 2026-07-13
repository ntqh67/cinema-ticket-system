/**
 * Mục đích: Lớp View dựng giao diện và cập nhật DOM cho miền sơ đồ và trạng thái ghế.
 */
/* CineTicket - View chọn ghế */
// Đối tượng SeatView đóng vai trò lớp hiển thị, dựng HTML và cập nhật DOM.
const SeatView = {
  // Dựng phần giao diện tương ứng trong khối render.
  async render(params) {
    const showtimeId = params.id;
    const main = document.getElementById('main-content');
    // Dừng hoặc đổi hướng luồng khi dữ liệu bắt buộc chưa sẵn sàng.
    if (!main) return;

    main.innerHTML = `
      <div class="page-wrapper">
        <div class="container">
          <div class="empty-state">Dang tai so do ghe...</div>
        </div>
      </div>`;

    await SeatController.init(showtimeId);

    // Kiểm tra trạng thái ghế và lượt giữ ghế trước khi cập nhật lựa chọn.
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
    // Dừng hoặc đổi hướng luồng khi dữ liệu bắt buộc chưa sẵn sàng.
    if (!showtime) {
      Router.notFound();
      return;
    }

    const movie = MovieModel.getById(showtime.movieId);
    const cinema = CinemaModel.getById(showtime.cinemaId);
    const room = SeatController.currentRoom;
    // Dừng hoặc đổi hướng luồng khi dữ liệu bắt buộc chưa sẵn sàng.
    if (!movie || !room) {
      Router.notFound();
      return;
    }

    const accepted = await this._ensureAgeWarningAccepted(movie, showtimeId);
    // Dừng hoặc đổi hướng luồng khi dữ liệu bắt buộc chưa sẵn sàng.
    if (!accepted) {
      Router.navigate(`/movies/${movie.id}`);
      return;
    }

    document.getElementById('footer').style.display = '';

    const rows = SeatController.currentRows || [];
    // Xử lý riêng trường hợp danh sách rỗng hoặc có số lượng không hợp lệ.
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
    const maxPosition = this._maxPosition(rows);

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
              <div class="legend-item"><div class="legend-box normal"></div><span>Thuong - ${Helpers.formatCurrency(showtime.price.normal)}</span></div>
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

  // Dựng phần giao diện tương ứng trong khối _seatHtml.
  _seatHtml(showtime, seat) {
    const isUnavailable = (seat.isBooked || ['HELD', 'BOOKED', 'BLOCKED'].includes(seat.status)) && !seat.heldByMe;
    const price = seat.price || SeatModel.getPriceForType(showtime, seat.type);
    const label = seat.type === 'vip' ? 'VIP' : seat.type === 'couple' ? 'Doi' : 'Thuong';
    return `<button type="button" class="seat ${seat.type} ${isUnavailable ? 'booked' : ''} ${seat.heldByMe ? 'selected' : ''}"
      style="--seat-position:${seat.position || seat.col}"
      data-id="${seat.id}"
      data-showtime-seat-id="${seat.showtimeSeatId || seat.id}"
      data-type="${seat.type}"
      data-price="${price}"
      data-booked="${isUnavailable}"
      onclick="SeatView._handleSeatClick(this)"
      title="Ghe ${seat.id} - ${label}"
      ${isUnavailable ? 'disabled' : ''}
    >${seat.col}</button>`;
  },

  // Thực hiện trách nhiệm riêng của khối _maxPosition.
  _maxPosition(rows) {
    return Math.max(1, ...rows.flatMap((row) => row.seats.map((seat) => {
      const width = seat.type === 'couple' ? 2 : 1;
      return Number(seat.position || seat.col) + width - 1;
    })));
  },

  // Thực hiện trách nhiệm riêng của khối _ageWarningMessage.
  _ageWarningMessage(ageRating) {
    const warnings = {
      C13: 'Phim dành cho khán giả từ 13 tuổi trở lên.',
      C16: 'Phim dành cho khán giả từ 16 tuổi trở lên.',
      C18: 'Phim dành cho khán giả từ 18 tuổi trở lên.',
    };
    return warnings[ageRating] || '';
  },

  // Kiểm tra điều kiện nghiệp vụ trong khối _ensureAgeWarningAccepted trước khi tiếp tục.
  _ensureAgeWarningAccepted(movie, showtimeId) {
    const message = this._ageWarningMessage(movie.ageRating);
    // Dừng hoặc đổi hướng luồng khi dữ liệu bắt buộc chưa sẵn sàng.
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
          // Đánh giá điều kiện hiện tại để cập nhật giao diện và trạng thái đúng nhánh.
          if (this._ageWarningResolver) {
            this._ageWarningResolver(false);
            this._ageWarningResolver = null;
          }
        },
      });
    });
  },

  // Thực hiện trách nhiệm riêng của khối _ageRestrictionText.
  _ageRestrictionText(ageRating) {
    const text = {
      C13: 'dưới 13 tuổi',
      C16: 'dưới 16 tuổi',
      C18: 'dưới 18 tuổi',
    };
    return text[ageRating] || 'không đáp ứng phân loại độ tuổi';
  },

  // Điều phối sự kiện và phản hồi người dùng trong khối _acceptAgeWarning.
  _acceptAgeWarning(showtimeId) {
    // Đánh giá điều kiện hiện tại để cập nhật giao diện và trạng thái đúng nhánh.
    if (this._ageWarningResolver) {
      this._ageWarningResolver(true);
      this._ageWarningResolver = null;
    }
    Modal.close();
  },

  // Áp dụng quy tắc ghế và quyền sở hữu giữ ghế trong khối _bestSeatZone.
  _bestSeatZone(rows) {
    const usableRows = rows.filter((row) => row.seats.length > 0);
    // Xử lý riêng trường hợp danh sách rỗng hoặc có số lượng không hợp lệ.
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

  // Áp dụng quy tắc ghế và quyền sở hữu giữ ghế trong khối _bestSeatZoneOverlay.
  _bestSeatZoneOverlay(zone) {
    // Dừng hoặc đổi hướng luồng khi dữ liệu bắt buộc chưa sẵn sàng.
    if (!zone) return '';

    return `<div class="best-seat-zone"
      aria-hidden="true"
      style="--zone-left:${zone.left}px;--zone-top:${zone.top}px;--zone-width:${zone.width}px;--zone-height:${zone.height}px;"
    ></div>`;
  },

  // Áp dụng quy tắc ghế và quyền sở hữu giữ ghế trong khối _seatNumberHeader.
  _seatNumberHeader(rows) {
    const templateRow = rows.reduce((best, row) => {
      // Dừng hoặc đổi hướng luồng khi dữ liệu bắt buộc chưa sẵn sàng.
      if (!best) return row;
      return row.seats.length > best.seats.length ? row : best;
    }, null);
    const maxCol = templateRow ? templateRow.seats.length : 0;

    // Đánh giá điều kiện hiện tại để cập nhật giao diện và trạng thái đúng nhánh.
    if (maxCol === 0) return '';

    return `<div class="seat-number-row">
      <span class="seat-row-label"></span>
      ${templateRow.seats.map((seat, idx) => `<span class="seat-number-label ${seat.type === 'couple' ? 'couple' : ''}">${idx + 1}</span>`).join('')}
      <span class="seat-row-label"></span>
    </div>`;
  },

  // Điều phối sự kiện và phản hồi người dùng trong khối _handleSeatClick.
  async _handleSeatClick(el) {
    // Bắt đầu thao tác có thể thất bại để hiển thị phản hồi phù hợp cho người dùng.
    try {
      const toggled = await SeatController.toggleSeat(
        el.dataset.id,
        el.dataset.type,
        el.dataset.booked === 'true',
        el.dataset.showtimeSeatId,
        el.dataset.price
      );
      // Dừng hoặc đổi hướng luồng khi dữ liệu bắt buộc chưa sẵn sàng.
      if (!toggled) return;
      el.classList.toggle('selected', SeatController.isSelected(el.dataset.id));
      this._updateSummary();
    } catch (error) {
      Toast.error(error.message || 'Khong the giu ghe');
    }
  },

  // Cập nhật trạng thái hoặc dữ liệu trong khối _updateSummary.
  _updateSummary() {
    const seats = SeatController.selectedSeats;
    const total = SeatController.getTotalPrice();
    const listEl = document.getElementById('summary-seats-list');
    const totalEl = document.getElementById('summary-total');
    const btn = document.getElementById('proceed-btn');

    // Đánh giá điều kiện hiện tại để cập nhật giao diện và trạng thái đúng nhánh.
    if (listEl) {
      // Kiểm tra trạng thái ghế và lượt giữ ghế trước khi cập nhật lựa chọn.
      if (seats.length === 0) {
        listEl.innerHTML = '<span style="color:var(--color-text-dim);font-size:0.85rem;">Chua chon ghe</span>';
      } else {
        listEl.innerHTML = seats.map((seat) => `<span class="summary-seat-tag">${seat.id}</span>`).join('');
      }
    }
    // Đánh giá điều kiện hiện tại để cập nhật giao diện và trạng thái đúng nhánh.
    if (totalEl) totalEl.textContent = Helpers.formatCurrency(total);
    // Kiểm tra trạng thái ghế và lượt giữ ghế trước khi cập nhật lựa chọn.
    if (btn) btn.disabled = seats.length === 0;
  },
};
