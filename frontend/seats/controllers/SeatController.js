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
    } catch (error) {
      this.currentError = error.message || 'Khong the tai so do ghe';
    }

    State.set('selectedSeats', []);
  },

  toggleSeat(seatId, type, isBooked, showtimeSeatId, price) {
    if (isBooked) {
      Toast.warning('Ghe nay khong con trong');
      return false;
    }

    const idx = this.selectedSeats.findIndex((seat) => seat.id === seatId);
    if (idx !== -1) {
      this.selectedSeats.splice(idx, 1);
    } else {
      if (this.selectedSeats.length >= 8) {
        Toast.warning('Toi da 8 ghe moi lan dat');
        return false;
      }
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
    if (!AuthController.checkAuth()) return;
    if (this.selectedSeats.length === 0) {
      Toast.warning('Vui long chon it nhat 1 ghe');
      return;
    }

    try {
      const booking = await BookingModel.create({
        userId: API.getBackendUserId(),
        showtimeId: this.currentShowtime.id,
        showtimeSeatIds: this.selectedSeats.map((seat) => seat.showtimeSeatId),
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

      Router.navigate('/payment');
    } catch (error) {
      Toast.error(error.message || 'Khong the tao booking');
    }
  },
};
