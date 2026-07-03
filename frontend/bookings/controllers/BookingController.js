/* CineTicket - Booking Controller */
const BookingController = {
  getAll() { return BookingModel.getAll(); },
  getById(id) { return BookingModel.getById(id); },
  getByUser(userId) { return BookingModel.getByUser(userId); },
  handleCancel(id) {
    Modal.confirm('Bạn có chắc muốn hủy đặt vé này?', 'Hủy Đặt Vé', 'danger').then(ok => {
      if (ok) {
        BookingModel.cancel(id);
        Toast.success('Đã hủy đặt vé');
        Router.navigate('/history');
      }
    });
  }
};
