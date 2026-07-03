/* CineTicket - Ticket View */
const TicketView = {
  render(params) {
    const booking = TicketController.getTicket(params.id);
    if (!booking) { Router.notFound(); return; }
    document.getElementById('footer').style.display = '';
    const movie = MovieModel.getById(booking.movieId);
    const showtime = ShowtimeModel.getById(booking.showtimeId);
    const cinema = showtime ? CinemaModel.getById(showtime.cinemaId) : null;
    const room = showtime ? RoomModel.getById(showtime.roomId) : null;
    const main = document.getElementById('main-content');
    if (!main) return;

    const seatList = (booking.seats || []).map(s => typeof s === 'object' ? s.id : s);

    main.innerHTML = `
    <div class="ticket-page">
      <div class="container">
        <div class="ticket-page-center">
          <!-- Success Banner -->
          <div class="ticket-success-banner">
            <div class="ticket-success-icon"><i class="fas fa-check"></i></div>
            <h2 class="ticket-success-title">Đặt Vé Thành Công!</h2>
            <p class="ticket-success-sub">Vé của bạn đã được xác nhận. Vui lòng xuất trình mã QR khi vào rạp.</p>
          </div>

          <!-- Ticket Card -->
          <div class="ticket-card">
            <!-- Header with backdrop -->
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

            <!-- Tear Line -->
            <div class="ticket-tear"><div class="ticket-tear-line"></div></div>

            <!-- Ticket Body -->
            <div class="ticket-body">
              <div class="ticket-info-grid">
                <div class="ticket-info-item">
                  <div class="ticket-info-label">Ngày Chiếu</div>
                  <div class="ticket-info-value">${showtime ? showtime.date : ''}</div>
                </div>
                <div class="ticket-info-item">
                  <div class="ticket-info-label">Giờ Chiếu</div>
                  <div class="ticket-info-value highlight">${showtime ? showtime.startTime + ' – ' + showtime.endTime : ''}</div>
                </div>
                <div class="ticket-info-item">
                  <div class="ticket-info-label">Phòng</div>
                  <div class="ticket-info-value">${room ? Helpers.escapeHtml(room.name) : ''}</div>
                </div>
                <div class="ticket-info-item">
                  <div class="ticket-info-label">Loại Vé</div>
                  <div class="ticket-info-value">${room ? room.type : 'Standard'}</div>
                </div>
                <div class="ticket-info-item" style="grid-column:1/-1;">
                  <div class="ticket-info-label">Số Ghế</div>
                  <div class="ticket-info-value seats">
                    ${seatList.map(s => `<span class="seat-chip">${s}</span>`).join('')}
                  </div>
                </div>
                <div class="ticket-info-item">
                  <div class="ticket-info-label">Số Lượng</div>
                  <div class="ticket-info-value">${seatList.length} vé</div>
                </div>
                <div class="ticket-info-item">
                  <div class="ticket-info-label">Thanh Toán</div>
                  <div class="ticket-info-value">
                    ${booking.paymentMethod === 'cash' ? '<i class="fas fa-money-bill-wave" style="color:var(--color-success)"></i> Tiền mặt' :
                      booking.paymentMethod === 'card' ? '<i class="fas fa-credit-card" style="color:var(--color-info)"></i> Thẻ' :
                      booking.paymentMethod === 'momo' ? '<i class="fas fa-mobile-alt" style="color:#a80c5c"></i> MoMo' :
                      booking.paymentMethod === 'vnpay' ? 'VNPay' : booking.paymentMethod || 'N/A'}
                  </div>
                </div>
              </div>
            </div>

            <!-- Tear Line -->
            <div class="ticket-tear"><div class="ticket-tear-line"></div></div>

            <!-- Ticket Footer -->
            <div class="ticket-footer">
              <div class="ticket-qr">
                <div class="ticket-qr-placeholder">
                  <i class="fas fa-qrcode" style="font-size:3rem;color:#222;"></i>
                </div>
              </div>
              <div class="ticket-footer-info">
                <div class="ticket-booking-id">Mã Đặt Vé: <span>${booking.id.toUpperCase().slice(0,12)}</span></div>
                <div class="ticket-footer-note">Vui lòng xuất trình mã QR này tại quầy soát vé. Vé có hiệu lực 30 phút trước giờ chiếu.</div>
              </div>
              <div class="ticket-total">
                <div class="ticket-total-label">Tổng Tiền</div>
                <div class="ticket-total-amount">${Helpers.formatCurrency(booking.totalAmount || booking.totalPrice)}</div>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="ticket-actions">
            <button class="btn btn-primary" onclick="window.print()">
              <i class="fas fa-print"></i> In Vé
            </button>
            <button class="btn btn-secondary" onclick="Toast.info('Chức năng tải vé đang phát triển')">
              <i class="fas fa-download"></i> Tải Về
            </button>
            <button class="btn btn-outline" onclick="Router.navigate('/')">
              <i class="fas fa-home"></i> Về Trang Chủ
            </button>
          </div>
        </div>
      </div>
    </div>`;
  }
};
