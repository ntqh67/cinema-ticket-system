/* CineTicket - Payment Model */
const PaymentModel = {
  _onlineMethods: ['vnpay', 'card', 'momo', 'zalopay'],

  async process(bookingData) {
    if (!bookingData.backendBookingId) {
      throw new Error('Booking khong co ma backend. Vui long chon ghe lai.');
    }

    if (!this._onlineMethods.includes(bookingData.paymentMethod)) {
      throw new Error('Phuong thuc thanh toan khong hop le');
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
