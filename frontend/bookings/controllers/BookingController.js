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
    Modal.confirm('Ban co chac muon huy dat ve nay?', 'Huy Dat Ve', 'danger').then((ok) => {
      if (!ok) return;

      BookingModel.cancel(id)
        .then(() => {
          Toast.success('Da huy dat ve');
          if (location.hash.includes('/admin/bookings')) {
            BookingView.renderAdmin();
          } else {
            Router.navigate('/history');
          }
        })
        .catch((error) => {
          Toast.error(error.message || 'Khong the huy dat ve');
        });
    });
  },
};
