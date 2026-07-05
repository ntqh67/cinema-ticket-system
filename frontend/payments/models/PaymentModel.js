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

  applyPromotion(code, amount) {
    const promo = API.mockData.promotions.find((item) =>
      item.code.toUpperCase() === code.toUpperCase() && item.isActive
    );
    if (!promo) return { success: false, error: 'Ma khuyen mai khong hop le' };
    const now = new Date();
    if (new Date(promo.endDate) < now) return { success: false, error: 'Ma khuyen mai da het han' };
    if (amount < promo.minOrder) return { success: false, error: `Don hang toi thieu ${Helpers.formatCurrency(promo.minOrder)}` };
    let discount = 0;
    if (promo.discountType === 'percent') {
      discount = Math.min(amount * promo.discount, promo.maxDiscount);
    } else {
      discount = promo.discount;
    }
    return { success: true, discount, promo };
  },
};
