/* CineTicket - Promotion Controller */
const PromotionController = {
  getAll() { return PromotionModel.getAll(); },
  getActive() { return PromotionModel.getActive(); },
  handleDelete(id) {
    Modal.confirm('Xóa chương trình khuyến mãi này?', 'Xác Nhận', 'danger').then(ok => {
      if (ok) { PromotionModel.delete(id); PromotionView.renderAdmin(); Toast.success('Đã xóa khuyến mãi'); }
    });
  },
  handleToggle(id) {
    const promo = PromotionModel.getById(id);
    if (!promo) return;
    PromotionModel.update(id, { isActive: !promo.isActive });
    PromotionView.renderAdmin();
    Toast.success(promo.isActive ? 'Đã tắt khuyến mãi' : 'Đã kích hoạt khuyến mãi');
  }
};
