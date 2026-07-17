/**
 * Mục đích: Lớp Controller điều phối sự kiện giao diện và nghiệp vụ sơ đồ và trạng thái ghế.
 */
/* CineTicket - Controller ghế */
// Lớp SeatController nhận thao tác từ HTTP hoặc giao diện và chuyển chúng tới lớp nghiệp vụ phù hợp.
const SeatController = {
  selectedSeats: [],
  currentShowtime: null,
  currentRoom: null,
  currentRows: null,
  currentError: null,

  // Khởi tạo luồng init và chuẩn bị các phụ thuộc cần thiết.
  async init(showtimeId) {
    this.selectedSeats = [];
    this.currentShowtime = null;
    this.currentRoom = null;
    this.currentRows = null;
    this.currentError = null;

    // Bắt đầu thao tác có thể thất bại để hiển thị phản hồi phù hợp cho người dùng.
    try {
      const data = await SeatModel.getByShowtime(showtimeId);
      this.currentShowtime = data.showtime;
      this.currentRoom = data.room;
      this.currentRows = data.rows;
      this.selectedSeats = data.rows.flatMap((row) => row.seats)
        .filter((seat) => seat.heldByMe)
        .map((seat) => ({
          id: seat.id,
          showtimeSeatId: seat.showtimeSeatId,
          type: seat.type,
          price: Number(seat.price),
        }));
    } catch (error) {
      this.currentError = error.message || 'Không thể tải sơ đồ ghế';
    }

    State.set('selectedSeats', [...this.selectedSeats]);
  },

  // Cập nhật trạng thái hoặc dữ liệu trong khối toggleSeat.
  async toggleSeat(seatId, type, isBooked, showtimeSeatId, price) {
    // Đánh giá điều kiện hiện tại để cập nhật giao diện và trạng thái đúng nhánh.
    if (isBooked) {
      Toast.warning('Ghế này không còn trống');
      return false;
    }

    const idx = this.selectedSeats.findIndex((seat) => seat.id === seatId);
    // Dừng hoặc đổi hướng luồng khi dữ liệu bắt buộc chưa sẵn sàng.
    if (idx !== -1) {
      await API.releaseSeat(this.selectedSeats[idx].showtimeSeatId);
      this.selectedSeats.splice(idx, 1);
    } else {
      await API.holdSeat({
        showtimeId: this.currentShowtime.id,
        showtimeSeatId: showtimeSeatId || seatId,
      });
      this.selectedSeats.push({
        id: seatId,
        showtimeSeatId: showtimeSeatId || seatId,
        type,
        price: Number(price || SeatModel.getPriceForType(this.currentShowtime, type)),
      });
    }

    State.set('selectedSeats', [...this.selectedSeats]);
    return true;
  },

  // Đọc và lọc dữ liệu cần thiết trong khối getTotalPrice.
  getTotalPrice() {
    return this.selectedSeats.reduce((sum, seat) => sum + seat.price, 0);
  },

  // Kiểm tra điều kiện nghiệp vụ trong khối isSelected trước khi tiếp tục.
  isSelected(seatId) {
    return this.selectedSeats.some((seat) => seat.id === seatId);
  },

  // Điều phối sự kiện và phản hồi người dùng trong khối proceedToPayment.
  async proceedToPayment() {
    // Kiểm tra trạng thái ghế và lượt giữ ghế trước khi cập nhật lựa chọn.
    if (this.selectedSeats.length === 0) {
      Toast.warning('Vui lòng chọn ít nhất 1 ghế');
      return;
    }
    const orphanSeat = this._findOrphanStandardSeat();
    // Kiểm tra trạng thái ghế và lượt giữ ghế trước khi cập nhật lựa chọn.
    if (orphanSeat) {
      Toast.warning(`Không được để lại ghế ${orphanSeat.id} trống một mình. Vui lòng chọn lại ghế.`);
      return;
    }
    // Kiểm tra trạng thái đăng nhập hoặc vai trò trước khi cho phép thao tác.
    if (!AuthModel.isAuthenticated()) {
      const confirmed = await Modal.confirm(
        'Bạn cần đăng nhập trước khi tạo booking. Các ghế đang giữ sẽ được khôi phục khi bạn quay lại.',
        'Yêu cầu đăng nhập',
        'info'
      );
      // Dừng hoặc đổi hướng luồng khi dữ liệu bắt buộc chưa sẵn sàng.
      if (!confirmed) return;
      sessionStorage.setItem('post_login_route', `/seats/${this.currentShowtime.id}`);
      Router.navigate('/login');
      return;
    }

    try {
      const booking = await BookingModel.create({
        userId: API.getBackendUserId(),
        showtimeId: this.currentShowtime.id,
        showtimeSeatIds: this.selectedSeats.map((seat) => seat.showtimeSeatId),
        sessionId: API.getSeatHoldSessionId(),
      });
      const bookingItems = new Map(
        (booking.items || []).map(item => [item.showtimeSeatId, item]),
      );
      const pricedSeats = this.selectedSeats.map(seat => ({
        ...seat,
        originalPrice: seat.price,
        price: bookingItems.has(seat.showtimeSeatId)
          ? bookingItems.get(seat.showtimeSeatId).unitPrice
          : seat.price,
      }));

      State.set('currentBooking', {
        backendBookingId: booking.id,
        showtimeId: this.currentShowtime.id,
        movieId: this.currentShowtime.movieId,
        cinemaId: this.currentShowtime.cinemaId,
        roomId: this.currentShowtime.roomId,
        seats: pricedSeats,
        totalPrice: booking.totalAmount ?? this.getTotalPrice(),
        seatSubtotal: booking.seatSubtotal ?? booking.totalAmount ?? 0,
        accountRole: booking.accountRole,
        ticketDiscountPercent: booking.ticketDiscountPercent || 0,
        expiresAt: booking.expiresAt,
      });

      Router.navigate('/concessions');
    } catch (error) {
      Toast.error(error.message || 'Không thể tạo booking');
    }
  },

  // Đọc và lọc dữ liệu cần thiết trong khối _findOrphanStandardSeat.
  _findOrphanStandardSeat() {
    const selectedIds = new Set(this.selectedSeats.map((seat) => seat.id));
    // Duyệt danh sách để dựng hoặc cập nhật từng phần tử giao diện.
    for (const row of this.currentRows || []) {
      const standardSeats = row.seats
        .filter((seat) => seat.type !== 'couple')
        .sort((a, b) => Number(a.position || a.col) - Number(b.position || b.col));
      const blocks = [];
      standardSeats.forEach((seat) => {
        const block = blocks[blocks.length - 1];
        const previous = block && block[block.length - 1];
        // Kiểm tra trạng thái ghế và lượt giữ ghế trước khi cập nhật lựa chọn.
        if (!previous || Number(seat.position || seat.col) !== Number(previous.position || previous.col) + 1) {
          blocks.push([seat]);
        } else {
          block.push(seat);
        }
      });
      // Duyệt danh sách để dựng hoặc cập nhật từng phần tử giao diện.
      for (const block of blocks) {
        // Duyệt danh sách để dựng hoặc cập nhật từng phần tử giao diện.
        for (let index = 1; index < block.length - 1; index += 1) {
          const current = block[index];
          const isAvailable = !current.isBooked
            && !['HELD', 'BOOKED'].includes(current.status)
            && !selectedIds.has(current.id);
          // Dừng hoặc đổi hướng luồng khi dữ liệu bắt buộc chưa sẵn sàng.
          if (!isAvailable) continue;
          const hasAvailableNeighbor = [block[index - 1], block[index + 1]].some((neighbor) =>
            !neighbor.isBooked
              && !['HELD', 'BOOKED'].includes(neighbor.status)
              && !selectedIds.has(neighbor.id)
          );
          // Dừng hoặc đổi hướng luồng khi dữ liệu bắt buộc chưa sẵn sàng.
          if (!hasAvailableNeighbor) return current;
        }
      }
    }
    return null;
  },
};
