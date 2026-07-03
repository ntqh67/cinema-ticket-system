/* CineTicket - Room Controller */
const RoomController = {
  getAll() { return RoomModel.getAll(); },
  getByCinema(cinemaId) { return RoomModel.getByCinema(cinemaId); },
  handleDelete(id) {
    Modal.confirm('Xóa phòng chiếu này?', 'Xác Nhận', 'danger').then(ok => {
      if (ok) { RoomModel.delete(id); RoomView.renderAdmin(); Toast.success('Đã xóa phòng chiếu'); }
    });
  }
};
