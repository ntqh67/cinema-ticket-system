/* CineTicket - Payment Controller */
const PaymentController = {
  async handleSubmit(event, method) {
    event.preventDefault();
    if (!AuthController.checkAuth()) return;
    const onlineMethods = ['vnpay', 'card', 'momo', 'zalopay'];
    if (!onlineMethods.includes(method)) {
      Toast.error('Phương thức thanh toán không hợp lệ');
      return;
    }

    const booking = State.get('currentBooking');
    if (!booking) {
      Toast.error('Phiên đặt vé đã hết hạn');
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
      Toast.error('Phiên giữ ghế đã hết hạn. Vui lòng chọn ghế lại.');
      Router.navigate(`/seats/${booking.showtimeId}`);
      return;
    }

    const user = State.get('currentUser');
    const finalAmount = booking.totalPrice;
    const paymentData = {
      userId: user.id,
      backendBookingId: booking.backendBookingId,
      showtimeId: booking.showtimeId,
      movieId: booking.movieId,
      cinemaId: booking.cinemaId,
      roomId: booking.roomId,
      seats: booking.seats.map((seat) => typeof seat === 'object' ? seat.id : seat),
      totalAmount: finalAmount,
      comboItems: booking.comboItems || [],
      discount: 0,
      promoCode: null,
      paymentMethod: method,
      status: 'confirmed',
    };

    PaymentView.showProcessing();
    try {
      const result = await PaymentModel.process(paymentData);
      if (result.success && result.redirect && result.paymentUrl) {
        PaymentView._clearHoldCountdown();
        window.location.href = result.paymentUrl;
      } else if (result.success) {
        PaymentView._clearHoldCountdown();
        State.set('currentBooking', null);
        SeatController.selectedSeats = [];
        Router.navigate(`/ticket/${result.booking.id}`);
        Toast.success('Thanh toán thành công!');
      } else {
        Toast.error('Thanh toán thất bại, vui lòng thử lại');
        PaymentView.hideProcessing();
      }
    } catch (error) {
      Toast.error(error.message || 'Thanh toán thất bại, vui lòng thử lại');
      PaymentView.hideProcessing();
    }
  },
};
