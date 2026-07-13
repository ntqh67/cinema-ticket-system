/**
 * Mục đích: Lớp Controller điều phối sự kiện giao diện và nghiệp vụ combo bắp nước.
 */
/* CineTicket - Controller combo bắp nước */
// Lớp ConcessionController nhận thao tác từ HTTP hoặc giao diện và chuyển chúng tới lớp nghiệp vụ phù hợp.
const ConcessionController = {
  // Cập nhật trạng thái hoặc dữ liệu trong khối handleSave.
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

    // Dừng hoặc đổi hướng luồng khi dữ liệu bắt buộc chưa sẵn sàng.
    if (!data.name || data.price <= 0) {
      Toast.error('Vui lòng nhập tên combo và giá hợp lệ');
      return;
    }

    // Bắt đầu thao tác có thể thất bại để hiển thị phản hồi phù hợp cho người dùng.
    try {
      // Đánh giá điều kiện hiện tại để cập nhật giao diện và trạng thái đúng nhánh.
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

  // Xử lý việc gỡ bỏ, hủy hoặc giải phóng dữ liệu trong khối handleDelete.
  async handleDelete(comboId) {
    const ok = await Modal.confirm('Ẩn combo này khỏi danh sách đang bán?', 'Xác Nhận', 'danger');
    // Dừng hoặc đổi hướng luồng khi dữ liệu bắt buộc chưa sẵn sàng.
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
