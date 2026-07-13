/* CRTicket - Controller thanh toán */
const PaymentController = {
  // Tự tạo phiên thanh toán SePay khi người dùng vào trang thanh toán.
  async startSepayPayment(booking = State.get('currentBooking')) {
    if (!AuthController.checkAuth()) return;

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

    try {
      if (Number(booking.totalPrice || 0) === 0) {
        PaymentView.renderAdminFreeProcessing();
        const paid = await API.payBooking(booking.backendBookingId);
        PaymentView._clearSepayTimers();
        PaymentView._clearHoldCountdown();
        State.set('currentBooking', null);
        SeatController.selectedSeats = [];
        Router.navigate(`/ticket/${paid.bookingId}`);
        Toast.success('Đã phát hành vé Admin 0 ₫');
        return;
      }

      PaymentView.renderSepayLoading();
      const result = await PaymentModel.process({
        backendBookingId: booking.backendBookingId,
        paymentMethod: 'sepay',
      });

      if (!result.success || !result.sepay) {
        throw new Error('Không tạo được thanh toán SePay');
      }

      PaymentView.renderSepayQr(result.payment, booking);
    } catch (error) {
      if (Number(booking.totalPrice || 0) === 0) {
        PaymentView.renderAdminFreeError(error.message || 'Không thể phát hành vé Admin');
        Toast.error(error.message || 'Không thể phát hành vé Admin');
        return;
      }
      PaymentView.renderSepayError(error.message || 'Thanh toán SePay thất bại, vui lòng thử lại');
      Toast.error(error.message || 'Thanh toán SePay thất bại, vui lòng thử lại');
    }
  },
};
