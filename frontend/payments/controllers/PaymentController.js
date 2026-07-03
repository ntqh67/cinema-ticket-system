/* CineTicket - Payment Controller */
const PaymentController = {
  _discount: 0,
  _appliedPromo: null,

  handleApplyPromo(code) {
    const booking = State.get('currentBooking');
    if (!booking) return;
    const result = PaymentModel.applyPromotion(code, booking.totalPrice);
    if (!result.success) {
      Toast.error(result.error);
      return;
    }
    this._discount = result.discount;
    this._appliedPromo = result.promo;
    Toast.success(`Ap dung ma thanh cong! Giam ${Helpers.formatCurrency(result.discount)}`);
    PaymentView.updateTotal(booking.totalPrice, result.discount);
    PaymentView.showPromoResult(result.promo, result.discount);
  },

  handleRemovePromo() {
    this._discount = 0;
    this._appliedPromo = null;
    const booking = State.get('currentBooking');
    PaymentView.updateTotal(booking ? booking.totalPrice : 0, 0);
    PaymentView.hidePromoResult();
  },

  async handleSubmit(event, method) {
    event.preventDefault();
    if (!AuthController.checkAuth()) return;
    const booking = State.get('currentBooking');
    if (!booking) {
      Toast.error('Phien dat ve da het han');
      Router.navigate('/');
      return;
    }

    const user = State.get('currentUser');
    const finalAmount = booking.totalPrice - this._discount;
    const paymentData = {
      userId: user.id,
      backendBookingId: booking.backendBookingId,
      showtimeId: booking.showtimeId,
      movieId: booking.movieId,
      cinemaId: booking.cinemaId,
      roomId: booking.roomId,
      seats: booking.seats.map((seat) => typeof seat === 'object' ? seat.id : seat),
      totalAmount: finalAmount,
      discount: this._discount,
      promoCode: this._appliedPromo ? this._appliedPromo.code : null,
      paymentMethod: method,
      status: 'confirmed',
    };

    PaymentView.showProcessing();
    try {
      const result = await PaymentModel.process(paymentData);
      if (result.success) {
        State.set('currentBooking', null);
        SeatController.selectedSeats = [];
        Router.navigate(`/ticket/${result.booking.id}`);
        Toast.success('Thanh toan thanh cong!');
      } else {
        Toast.error('Thanh toan that bai, vui long thu lai');
        PaymentView.hideProcessing();
      }
    } catch (error) {
      Toast.error(error.message || 'Thanh toan that bai, vui long thu lai');
      PaymentView.hideProcessing();
    }
  },
};
