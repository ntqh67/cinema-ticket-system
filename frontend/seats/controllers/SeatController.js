/* CineTicket - Seat Controller */
const SeatController = {
  selectedSeats: [],
  currentShowtime: null,
  currentRoom: null,

  init(showtimeId) {
    this.selectedSeats = [];
    this.currentShowtime = API.mockData.showtimes.find(s => s.id === showtimeId);
    if (this.currentShowtime) {
      this.currentRoom = RoomModel.getById(this.currentShowtime.roomId);
    }
    State.set('selectedSeats', []);
  },

  toggleSeat(seatId, type, isBooked) {
    if (isBooked) { Toast.warning('Ghế này đã được đặt'); return false; }
    const idx = this.selectedSeats.findIndex(s => s.id === seatId);
    if (idx !== -1) {
      this.selectedSeats.splice(idx, 1);
    } else {
      if (this.selectedSeats.length >= 8) { Toast.warning('Tối đa 8 ghế mỗi lần đặt'); return false; }
      const price = SeatModel.getPriceForType(this.currentShowtime, type);
      this.selectedSeats.push({ id: seatId, type, price });
    }
    State.set('selectedSeats', [...this.selectedSeats]);
    return true;
  },

  getTotalPrice() {
    return this.selectedSeats.reduce((sum, s) => sum + s.price, 0);
  },

  isSelected(seatId) {
    return this.selectedSeats.some(s => s.id === seatId);
  },

  proceedToPayment() {
    if (!AuthController.checkAuth()) return;
    if (this.selectedSeats.length === 0) { Toast.warning('Vui lòng chọn ít nhất 1 ghế'); return; }
    State.set('currentBooking', {
      showtimeId: this.currentShowtime.id,
      movieId: this.currentShowtime.movieId,
      cinemaId: this.currentShowtime.cinemaId,
      roomId: this.currentShowtime.roomId,
      seats: this.selectedSeats,
      totalPrice: this.getTotalPrice()
    });
    Router.navigate('/payment');
  }
};
