/* CineTicket - Showtime Controller */
const ShowtimeController = {
  getByMovie(movieId) { return ShowtimeModel.getByMovie(movieId); },
  getByFilters(filters) { return ShowtimeModel.getByFilters(filters); },
  async handleCreate(event) {
    event.preventDefault();
    const form = event.target;
    const movieId = form.querySelector('#showtime-movie-id').value;
    const roomId = form.querySelector('#showtime-room-id').value;
    const date = form.querySelector('#showtime-date').value;
    const time = form.querySelector('#showtime-time').value;
    const basePrice = Number(form.querySelector('#showtime-base-price').value || 80000);
    const movie = MovieModel.getById(movieId);

    if (!movie || !roomId || !date || !time) {
      Toast.error('Vui long nhap du thong tin lich chieu');
      return;
    }

    const startAt = new Date(`${date}T${time}:00+07:00`);
    const endAt = new Date(startAt.getTime() + movie.duration * 60 * 1000);

    try {
      await ShowtimeModel.create({
        movieId,
        roomId,
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString(),
        basePrice,
      });
      await API.syncBackendCatalog();
      Modal.close();
      Toast.success('Da tao lich chieu');
      ShowtimeView.renderAdmin();
    } catch (error) {
      Toast.error(error.message || 'Khong the tao lich chieu');
    }
  },
  handleDelete(id) {
    Modal.confirm('Xóa lịch chiếu này?', 'Xác Nhận', 'danger').then(ok => {
      if (ok) { ShowtimeModel.delete(id); ShowtimeView.renderAdmin(); Toast.success('Đã xóa lịch chiếu'); }
    });
  }
};
