/* CineTicket - Payment Model */
const PaymentModel = {
  process(bookingData) {
    const booking = {
      ...bookingData,
      id: 'bk' + Helpers.generateId(),
      status: 'confirmed',
      createdAt: new Date().toISOString()
    };
    API.mockData.bookings.push(booking);
    API._save('bookings');
    // Update showtime
    const showtime = API.mockData.showtimes.find(s => s.id === bookingData.showtimeId);
    if (showtime && bookingData.seats) {
      showtime.bookedSeats = (showtime.bookedSeats || 0) + bookingData.seats.length;
      API._save('showtimes');
    }
    return { success: true, booking };
  },

  applyPromotion(code, amount) {
    const promo = API.mockData.promotions.find(p =>
      p.code.toUpperCase() === code.toUpperCase() && p.isActive
    );
    if (!promo) return { success: false, error: 'Mã khuyến mãi không hợp lệ' };
    const now = new Date();
    if (new Date(promo.endDate) < now) return { success: false, error: 'Mã khuyến mãi đã hết hạn' };
    if (amount < promo.minOrder) return { success: false, error: `Đơn hàng tối thiểu ${Helpers.formatCurrency(promo.minOrder)}` };
    let discount = 0;
    if (promo.discountType === 'percent') {
      discount = Math.min(amount * promo.discount, promo.maxDiscount);
    } else {
      discount = promo.discount;
    }
    return { success: true, discount, promo };
  }
};
