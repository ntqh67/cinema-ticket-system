/* CineTicket - Seat Controller */
const SeatController = {
  selectedSeats: [],
  currentShowtime: null,
  currentRoom: null,
  currentRows: null,
  currentError: null,

  async init(showtimeId) {
    this.selectedSeats = [];
    this.currentShowtime = null;
    this.currentRoom = null;
    this.currentRows = null;
    this.currentError = null;

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

  async toggleSeat(seatId, type, isBooked, showtimeSeatId, price) {
    if (isBooked) {
      Toast.warning('Ghế này không còn trống');
      return false;
    }

    const idx = this.selectedSeats.findIndex((seat) => seat.id === seatId);
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

  getTotalPrice() {
    return this.selectedSeats.reduce((sum, seat) => sum + seat.price, 0);
  },

  isSelected(seatId) {
    return this.selectedSeats.some((seat) => seat.id === seatId);
  },

  async proceedToPayment() {
    if (this.selectedSeats.length === 0) {
      Toast.warning('Vui lòng chọn ít nhất 1 ghế');
      return;
    }
    const orphanSeat = this._findOrphanStandardSeat();
    if (orphanSeat) {
      Toast.warning(`Không được để lại ghế ${orphanSeat.id} trống một mình. Vui lòng chọn lại ghế.`);
      return;
    }
    if (!AuthModel.isAuthenticated()) {
      const confirmed = await Modal.confirm(
        'Bạn cần đăng nhập trước khi tạo booking. Các ghế đang giữ sẽ được khôi phục khi bạn quay lại.',
        'Yêu cầu đăng nhập',
        'info'
      );
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

      State.set('currentBooking', {
        backendBookingId: booking.id,
        showtimeId: this.currentShowtime.id,
        movieId: this.currentShowtime.movieId,
        cinemaId: this.currentShowtime.cinemaId,
        roomId: this.currentShowtime.roomId,
        seats: this.selectedSeats,
        totalPrice: booking.totalAmount || this.getTotalPrice(),
        expiresAt: booking.expiresAt,
      });

      Router.navigate('/concessions');
    } catch (error) {
      Toast.error(error.message || 'Không thể tạo booking');
    }
  },

  _findOrphanStandardSeat() {
    const selectedIds = new Set(this.selectedSeats.map((seat) => seat.id));
    for (const row of this.currentRows || []) {
      const standardSeats = row.seats
        .filter((seat) => seat.type !== 'couple')
        .sort((a, b) => Number(a.position || a.col) - Number(b.position || b.col));
      const blocks = [];
      standardSeats.forEach((seat) => {
        const block = blocks[blocks.length - 1];
        const previous = block && block[block.length - 1];
        if (!previous || Number(seat.position || seat.col) !== Number(previous.position || previous.col) + 1) {
          blocks.push([seat]);
        } else {
          block.push(seat);
        }
      });
      for (const block of blocks) {
        for (let index = 1; index < block.length - 1; index += 1) {
          const current = block[index];
          const isAvailable = !current.isBooked
            && !['HELD', 'BOOKED', 'BLOCKED'].includes(current.status)
            && !selectedIds.has(current.id);
          if (!isAvailable) continue;
          const hasAvailableNeighbor = [block[index - 1], block[index + 1]].some((neighbor) =>
            !neighbor.isBooked
              && !['HELD', 'BOOKED', 'BLOCKED'].includes(neighbor.status)
              && !selectedIds.has(neighbor.id)
          );
          if (!hasAvailableNeighbor) return current;
        }
      }
    }
    return null;
  },
};
