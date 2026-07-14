/* CRTicket - Controller thanh toán */
const PaymentController = {
  _applyingPromotion: false,

  // Xác thực mã ở backend, cập nhật tổng tiền và thay phiên SePay theo giá mới.
  async handleApplyPromotion() {
    if (this._applyingPromotion) return;
    const booking = State.get('currentBooking');
    const input = document.getElementById('payment-promotion-code');
    const code = String(input?.value || '').trim().toUpperCase();
    if (!booking?.backendBookingId) {
      Toast.error('Phiên đặt vé không hợp lệ');
      return;
    }
    if (!code) {
      PaymentView.showPromotionError('Vui lòng nhập mã ưu đãi');
      return;
    }

    this._applyingPromotion = true;
    PaymentView.setPromotionBusy(true);
    try {
      const result = await PaymentModel.applyPromotion(
        booking.backendBookingId,
        code,
      );
      const updatedBooking = {
        ...booking,
        totalPrice: result.totalAmount,
        promotion: result.promotion,
        promotionDiscount: result.discountAmount,
        originalTotal: result.originalAmount,
      };
      State.set('currentBooking', updatedBooking);
      PaymentView._clearSepayTimers();
      PaymentView.showPromotionSuccess(result);
      PaymentView.updatePromotionSummary(result);
      Toast.success(`Đã áp dụng mã ${result.promotion.code}`);
      await this.startSepayPayment(updatedBooking);
    } catch (error) {
      PaymentView.showPromotionError(
        error.message || 'Không thể áp dụng mã ưu đãi',
      );
      Toast.error(error.message || 'Không thể áp dụng mã ưu đãi');
    } finally {
      this._applyingPromotion = false;
      PaymentView.setPromotionBusy(false);
    }
  },

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
        PaymentView.renderZeroAmountProcessing(booking);
        const paid = await API.payBooking(booking.backendBookingId);
        PaymentView._clearSepayTimers();
        PaymentView._clearHoldCountdown();
        State.set('currentBooking', null);
        SeatController.selectedSeats = [];
        Router.navigate(`/ticket/${paid.bookingId}`);
        Toast.success(
          booking.promotion
            ? `Đã phát hành vé với mã ${booking.promotion.code}`
            : 'Đã phát hành vé Admin 0 ₫',
        );
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
        PaymentView.renderZeroAmountError(
          error.message || 'Không thể phát hành vé 0 ₫',
        );
        Toast.error(error.message || 'Không thể phát hành vé 0 ₫');
        return;
      }
      PaymentView.renderSepayError(error.message || 'Thanh toán SePay thất bại, vui lòng thử lại');
      Toast.error(error.message || 'Thanh toán SePay thất bại, vui lòng thử lại');
    }
  },
};
