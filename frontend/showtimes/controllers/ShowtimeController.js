/* CineTicket - Showtime Controller */
const ShowtimeController = {
  getByMovie(movieId) { return ShowtimeModel.getByMovie(movieId); },
  getByFilters(filters) { return ShowtimeModel.getByFilters(filters); },
  handleDelete(id) {
    Modal.confirm('Xóa lịch chiếu này?', 'Xác Nhận', 'danger').then(ok => {
      if (ok) { ShowtimeModel.delete(id); ShowtimeView.renderAdmin(); Toast.success('Đã xóa lịch chiếu'); }
    });
  }
};
