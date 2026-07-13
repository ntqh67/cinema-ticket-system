/**
 * Mục đích: Lớp Controller điều phối sự kiện giao diện và nghiệp vụ thanh toán.
 */
/* CineTicket - Controller thanh toán */
// Lớp PaymentController nhận thao tác từ HTTP hoặc giao diện và chuyển chúng tới lớp nghiệp vụ phù hợp.
const PaymentController = {
  // Điều phối sự kiện và phản hồi người dùng trong khối handleSubmit.
  async handleSubmit(event, method) {
    event.preventDefault();
    // Kiểm tra trạng thái đăng nhập hoặc vai trò trước khi cho phép thao tác.
    if (!AuthController.checkAuth()) return;
    const onlineMethods = ['sepay', 'vnpay', 'card', 'momo', 'zalopay'];
    // Dừng hoặc đổi hướng luồng khi dữ liệu bắt buộc chưa sẵn sàng.
    if (!onlineMethods.includes(method)) {
      Toast.error('Phương thức thanh toán không hợp lệ');
      return;
    }

    const booking = State.get('currentBooking');
    // Kiểm tra trạng thái booking hoặc thanh toán để chọn bước giao diện tiếp theo.
    if (!booking) {
      Toast.error('Phiên đặt vé đã hết hạn');
      Router.navigate('/');
      return;
    }
    // Kiểm tra trạng thái booking hoặc thanh toán để chọn bước giao diện tiếp theo.
    if (booking.expiresAt && new Date(booking.expiresAt).getTime() <= Date.now()) {
      // Bắt đầu thao tác có thể thất bại để hiển thị phản hồi phù hợp cho người dùng.
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
    // Bắt đầu thao tác có thể thất bại để hiển thị phản hồi phù hợp cho người dùng.
    try {
      const result = await PaymentModel.process(paymentData);
      // Kiểm tra kết quả từ backend và chuyển sang nhánh báo lỗi khi cần.
      if (result.success && result.sepay) {
        PaymentView.hideProcessing();
        PaymentView.showSepayQr(result.payment, booking);
      } else if (result.success && result.redirect && result.paymentUrl) {
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
