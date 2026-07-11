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
      Toast.error('Vui long nhap ten combo va gia hop le');
      return;
    }

    try {
      if (comboId) {
        await API.updateAdminConcessionCombo(comboId, data);
      } else {
        await API.createAdminConcessionCombo(data);
      }
      Modal.close();
      Toast.success('Da luu combo');
      ConcessionView.renderAdmin();
    } catch (error) {
      Toast.error(error.message || 'Khong the luu combo');
    }
  },

  async handleDelete(comboId) {
    const ok = await Modal.confirm('An combo nay khoi danh sach dang ban?', 'Xac Nhan', 'danger');
    if (!ok) return;
    try {
      await API.deleteAdminConcessionCombo(comboId);
      Toast.success('Da an combo');
      ConcessionView.renderAdmin();
    } catch (error) {
      Toast.error(error.message || 'Khong the an combo');
    }
  },
};
