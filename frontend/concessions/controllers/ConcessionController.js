/* CineTicket - Concession Controller */
const ConcessionController = {
  async handleSave(event, comboId = null) {
    event.preventDefault();
    const form = event.target;
    const data = {
      name: form.querySelector('#combo-name').value.trim(),
      description: form.querySelector('#combo-description').value.trim(),
      price: Number(form.querySelector('#combo-price').value || 0),
      imageUrl: form.querySelector('#combo-image').value.trim(),
      isActive: form.querySelector('#combo-active').checked,
    };

    if (!data.name || data.price <= 0) {
      Toast.error('Vui lòng nhập tên combo và giá hợp lệ');
      return;
    }

    try {
      if (comboId) {
        await API.updateAdminConcessionCombo(comboId, data);
      } else {
        await API.createAdminConcessionCombo(data);
      }
      Modal.close();
      Toast.success('Đã lưu combo');
      ConcessionView.renderAdmin();
    } catch (error) {
      Toast.error(error.message || 'Không thể lưu combo');
    }
  },

  async handleDelete(comboId) {
    const ok = await Modal.confirm('Ẩn combo này khỏi danh sách đang bán?', 'Xác Nhận', 'danger');
    if (!ok) return;
    try {
      await API.deleteAdminConcessionCombo(comboId);
      Toast.success('Đã ẩn combo');
      ConcessionView.renderAdmin();
    } catch (error) {
      Toast.error(error.message || 'Không thể ẩn combo');
    }
  },
};
