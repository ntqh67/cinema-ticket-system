/* CineTicket - Payment Model */
const PaymentModel = {
  async process(bookingData) {
    if (!bookingData.backendBookingId) {
      return this._processMock(bookingData);
    }

    const paid = await API.payBooking(bookingData.backendBookingId);
    const booking = {
      ...bookingData,
      id: paid.bookingId,
      userId: API.getBackendUserId(),
      status: 'confirmed',
      backendStatus: paid.status,
      paymentStatus: paid.payment.status,
      paymentProvider: paid.payment.provider,
      paymentRef: paid.payment.providerRef,
      paidAt: paid.payment.paidAt,
      totalAmount: paid.payment.amount,
      tickets: paid.tickets,
      qrToken: paid.tickets && paid.tickets[0] ? paid.tickets[0].qrToken : null,
      createdAt: new Date().toISOString(),
    };

    const existingIdx = API.mockData.bookings.findIndex((item) => item.id === booking.id);
    if (existingIdx === -1) API.mockData.bookings.push(booking);
    else API.mockData.bookings[existingIdx] = booking;
    API._save('bookings');
    API._cacheTickets(paid.tickets.map((ticket) => ({
      ...ticket,
      booking: {
        id: booking.id,
        status: 'PAID',
        totalAmount: booking.totalAmount,
        currency: 'USD',
      },
      movie: { id: booking.movieId, title: MovieModel.getById(booking.movieId)?.title || 'Midnight Circuit' },
      showtime: {
        id: booking.showtimeId,
        startAt: new Date().toISOString(),
        endAt: new Date().toISOString(),
      },
      cinema: { id: booking.cinemaId, name: CinemaModel.getById(booking.cinemaId)?.name || 'Aurora Cineplex' },
      room: { id: booking.roomId, name: RoomModel.getById(booking.roomId)?.name || 'Screen 1' },
    })));

    return { success: true, booking, payment: paid.payment, tickets: paid.tickets };
  },

  _processMock(bookingData) {
    const booking = {
      ...bookingData,
      id: 'bk' + Helpers.generateId(),
      status: 'confirmed',
      createdAt: new Date().toISOString(),
    };
    API.mockData.bookings.push(booking);
    API._save('bookings');
    const showtime = API.mockData.showtimes.find((item) => item.id === bookingData.showtimeId);
    if (showtime && bookingData.seats) {
      showtime.bookedSeats = (showtime.bookedSeats || 0) + bookingData.seats.length;
      API._save('showtimes');
    }
    return { success: true, booking };
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
