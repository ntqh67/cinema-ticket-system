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
    const onlineMethods = ['vnpay', 'card', 'momo', 'zalopay'];
    if (!onlineMethods.includes(method)) {
      Toast.error('Phuong thuc thanh toan khong hop le');
      return;
    }

    const booking = State.get('currentBooking');
    if (!booking) {
      Toast.error('Phien dat ve da het han');
      Router.navigate('/');
      return;
    }
    if (booking.expiresAt && new Date(booking.expiresAt).getTime() <= Date.now()) {
      try {
        await API.expireBookings();
      } catch (error) {
        console.warn('Could not expire pending bookings:', error);
      }
      State.set('currentBooking', null);
      Toast.error('Phien giu ghe da het han. Vui long chon ghe lai.');
      Router.navigate(`/seats/${booking.showtimeId}`);
      return;
    }

    const user = State.get('currentUser');
    let finalAmount = booking.totalPrice + PaymentView.getComboSubtotal();
    let comboItems = PaymentView.getSelectedComboItems();
    const paymentData = {
      userId: user.id,
      backendBookingId: booking.backendBookingId,
      showtimeId: booking.showtimeId,
      movieId: booking.movieId,
      cinemaId: booking.cinemaId,
      roomId: booking.roomId,
      seats: booking.seats.map((seat) => typeof seat === 'object' ? seat.id : seat),
      totalAmount: finalAmount,
      comboItems,
      discount: 0,
      promoCode: null,
      paymentMethod: method,
      status: 'confirmed',
    };

    PaymentView.showProcessing();
    try {
      const comboResult = await API.updateBookingCombos(booking.backendBookingId, comboItems);
      finalAmount = comboResult.totalAmount;
      paymentData.totalAmount = finalAmount;
      paymentData.comboItems = comboResult.comboItems || [];
      State.set('currentBooking', {
        ...booking,
        totalPrice: finalAmount,
        seatSubtotal: comboResult.seatSubtotal,
        comboSubtotal: comboResult.comboSubtotal,
        comboItems: comboResult.comboItems || [],
      });
      const result = await PaymentModel.process(paymentData);
      if (result.success && result.redirect && result.paymentUrl) {
        PaymentView._clearHoldCountdown();
        window.location.href = result.paymentUrl;
      } else if (result.success) {
        PaymentView._clearHoldCountdown();
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
