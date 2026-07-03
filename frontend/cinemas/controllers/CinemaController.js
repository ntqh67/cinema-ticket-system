/* CineTicket - Cinema Controller */
const CinemaController = {
  getAll() { return CinemaModel.getAll(); },
  getById(id) { return CinemaModel.getById(id); },
  handleDelete(id) {
    Modal.confirm('Bạn có chắc muốn xóa rạp này?', 'Xác Nhận Xóa', 'danger').then(confirmed => {
      if (confirmed) {
        CinemaModel.delete(id);
        CinemaView.renderAdmin();
        Toast.success('Đã xóa rạp chiếu');
      }
    });
  }
};
