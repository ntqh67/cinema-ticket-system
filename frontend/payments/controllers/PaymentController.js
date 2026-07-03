/* CineTicket - Payment Controller */
const PaymentController = {
  _discount: 0,
  _appliedPromo: null,

  handleApplyPromo(code) {
    const booking = State.get('currentBooking');
    if (!booking) return;
    const result = PaymentModel.applyPromotion(code, booking.totalPrice);
    if (!result.success) { Toast.error(result.error); return; }
    this._discount = result.discount;
    this._appliedPromo = result.promo;
    Toast.success(`Áp dụng mã thành công! Giảm ${Helpers.formatCurrency(result.discount)}`);
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

  handleSubmit(event, method) {
    event.preventDefault();
    if (!AuthController.checkAuth()) return;
    const booking = State.get('currentBooking');
    if (!booking) { Toast.error('Phiên đặt vé đã hết hạn'); Router.navigate('/'); return; }

    const user = State.get('currentUser');
    const finalAmount = booking.totalPrice - this._discount;
    const paymentData = {
      userId: user.id,
      showtimeId: booking.showtimeId,
      movieId: booking.movieId,
      cinemaId: booking.cinemaId,
      roomId: booking.roomId,
      seats: booking.seats.map(s => typeof s === 'object' ? s.id : s),
      totalAmount: finalAmount,
      discount: this._discount,
      promoCode: this._appliedPromo ? this._appliedPromo.code : null,
      paymentMethod: method,
      status: 'confirmed'
    };

    PaymentView.showProcessing();
    setTimeout(() => {
      const result = PaymentModel.process(paymentData);
      if (result.success) {
        State.set('currentBooking', null);
        SeatController.selectedSeats = [];
        Router.navigate(`/ticket/${result.booking.id}`);
        Toast.success('Thanh toán thành công!');
      } else {
        Toast.error('Thanh toán thất bại, vui lòng thử lại');
        PaymentView.hideProcessing();
      }
    }, 1800);
  }
};
