/* CRTicket - Model thanh toán */
const PaymentModel = {
  // Web khách hàng hiện chỉ tạo thanh toán SePay để webhook xác nhận tự động.
  async process(bookingData) {
    if (!bookingData.backendBookingId) {
      throw new Error('Booking không có mã backend. Vui lòng chọn ghế lại.');
    }

    if (bookingData.paymentMethod && bookingData.paymentMethod !== 'sepay') {
      throw new Error('CRTicket hiện chỉ hỗ trợ thanh toán SePay.');
    }

    const sepay = await API.createSepayPayment(bookingData.backendBookingId);
    return { success: true, sepay: true, payment: sepay, booking: bookingData };
  },

  // Gửi mã lên backend để giá cuối cùng luôn được tính từ dữ liệu PostgreSQL.
  async applyPromotion(backendBookingId, code) {
    if (!backendBookingId) {
      throw new Error('Booking không có mã backend. Vui lòng chọn ghế lại.');
    }
    return API.applyBookingPromotion(backendBookingId, code);
  },
};
