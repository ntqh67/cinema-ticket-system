/* CineTicket - Payment Model */
const PaymentModel = {
  _onlineMethods: ['sepay', 'vnpay', 'card', 'momo', 'zalopay'],

  async process(bookingData) {
    if (!bookingData.backendBookingId) {
      throw new Error('Booking khong co ma backend. Vui long chon ghe lai.');
    }

    if (!this._onlineMethods.includes(bookingData.paymentMethod)) {
      throw new Error('Phuong thuc thanh toan khong hop le');
    }

    if (bookingData.paymentMethod === 'sepay') {
      const sepay = await API.createSepayPayment(bookingData.backendBookingId);
      return { success: true, sepay: true, payment: sepay, booking: bookingData };
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
