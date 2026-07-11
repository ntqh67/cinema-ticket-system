/* CineTicket - Booking Controller */
const BookingController = {
  getAll() {
    return BookingModel.getAll();
  },

  getById(id) {
    return BookingModel.getById(id);
  },

  getByUser(userId) {
    return BookingModel.getByUser(userId);
  },

  handleCancel(id) {
    Modal.confirm('Bạn có chắc muốn hủy đặt vé này?', 'Hủy Đặt Vé', 'danger').then((ok) => {
      if (!ok) return;

      BookingModel.cancel(id)
        .then(() => {
          Toast.success('Đã hủy đặt vé');
          if (location.hash.includes('/admin/bookings')) {
            BookingView.renderAdmin();
          } else {
            Router.navigate('/history');
          }
        })
        .catch((error) => {
          Toast.error(error.message || 'Không thể hủy đặt vé');
        });
    });
  },
};
