/**
 * Mục đích: Lớp Model phía trình duyệt, chịu trách nhiệm đọc/ghi dữ liệu thanh toán.
 */
/* CineTicket - Model thanh toán */
// Đối tượng PaymentModel đóng vai trò lớp dữ liệu của frontend MVC.
const PaymentModel = {
  _onlineMethods: ['sepay', 'vnpay', 'card', 'momo', 'zalopay'],

  // Thực hiện trách nhiệm riêng của khối process.
  async process(bookingData) {
    // Kiểm tra trạng thái booking hoặc thanh toán để chọn bước giao diện tiếp theo.
    if (!bookingData.backendBookingId) {
      throw new Error('Booking khong co ma backend. Vui long chon ghe lai.');
    }

    // Kiểm tra trạng thái booking hoặc thanh toán để chọn bước giao diện tiếp theo.
    if (!this._onlineMethods.includes(bookingData.paymentMethod)) {
      throw new Error('Phuong thuc thanh toan khong hop le');
    }

    // Kiểm tra trạng thái booking hoặc thanh toán để chọn bước giao diện tiếp theo.
    if (bookingData.paymentMethod === 'sepay') {
      const sepay = await API.createSepayPayment(bookingData.backendBookingId);
      return { success: true, sepay: true, payment: sepay, booking: bookingData };
    }

    // Kiểm tra trạng thái booking hoặc thanh toán để chọn bước giao diện tiếp theo.
    if (bookingData.paymentMethod === 'vnpay') {
      const vnpay = await API.createVnpayPayment(bookingData.backendBookingId);
      return {
        success: true,
        redirect: true,
        paymentUrl: vnpay.paymentUrl,
        payment: vnpay,
        booking: bookingData,
      };
    }

    const paid = await API.onlineDemoPay(
      bookingData.backendBookingId,
      bookingData.paymentMethod
    );

    return {
      success: true,
      booking: {
        ...bookingData,
        id: paid.bookingId,
        paymentProvider: paid.payment.provider,
        paymentRef: paid.payment.providerRef,
      },
      payment: paid.payment,
    };
  },
};
