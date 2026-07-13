/**
 * Mục đích: Mã nguồn phục vụ khởi tạo và tiện ích dùng chung; các khối bên dưới được giữ tách biệt theo trách nhiệm.
 */
/* CineTicket - Thông báo nhanh */
// Đối tượng Toast gom các hành vi có cùng trách nhiệm để các phần khác tái sử dụng.
const Toast = {
  container: null,
  queue: [],

  // Đọc và lọc dữ liệu cần thiết trong khối _getContainer.
  _getContainer() {
    // Dừng hoặc đổi hướng luồng khi dữ liệu bắt buộc chưa sẵn sàng.
    if (!this.container) {
      this.container = document.getElementById('toast-container');
    }
    return this.container;
  },

  // Dựng phần giao diện tương ứng trong khối show.
  show(message, type = 'info', duration = 4000) {
    const container = this._getContainer();
    // Dừng hoặc đổi hướng luồng khi dữ liệu bắt buộc chưa sẵn sàng.
    if (!container) return;

    const icons = {
      success: 'fas fa-check-circle',
      error: 'fas fa-times-circle',
      warning: 'fas fa-exclamation-triangle',
      info: 'fas fa-info-circle'
    };
    const titles = {
      success: 'Thành công',
      error: 'Lỗi',
      warning: 'Cảnh báo',
      info: 'Thông báo'
    };

    const id = Helpers.generateId();
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.id = `toast-${id}`;
    toast.innerHTML = `
      <i class="toast-icon ${icons[type] || icons.info}"></i>
      <div class="toast-content">
        <div class="toast-title">${titles[type] || 'Thông báo'}</div>
        <div class="toast-message">${Helpers.escapeHtml(message)}</div>
      </div>
      <div class="toast-close" onclick="Toast._remove('${id}')">
        <i class="fas fa-times"></i>
      </div>
      <div class="toast-progress">
        <div class="toast-progress-bar" id="toast-pb-${id}" style="width:100%"></div>
      </div>
    `;

    container.appendChild(toast);

    // Đồng bộ hoạt ảnh thanh tiến trình với thời gian tự đóng thông báo.
    // Đánh giá điều kiện hiện tại để cập nhật giao diện và trạng thái đúng nhánh.
    if (duration > 0) {
      const pb = document.getElementById(`toast-pb-${id}`);
      // Đánh giá điều kiện hiện tại để cập nhật giao diện và trạng thái đúng nhánh.
      if (pb) {
        pb.style.transition = `width ${duration}ms linear`;
        requestAnimationFrame(() => {
          requestAnimationFrame(() => { pb.style.width = '0%'; });
        });
      }
      setTimeout(() => this._remove(id), duration);
    }

    return id;
  },

  // Xử lý việc gỡ bỏ, hủy hoặc giải phóng dữ liệu trong khối _remove.
  _remove(id) {
    const toast = document.getElementById(`toast-${id}`);
    // Đánh giá điều kiện hiện tại để cập nhật giao diện và trạng thái đúng nhánh.
    if (toast) {
      toast.classList.add('removing');
      setTimeout(() => {
        // Đánh giá điều kiện hiện tại để cập nhật giao diện và trạng thái đúng nhánh.
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 300);
    }
  },

  // Thực hiện trách nhiệm riêng của khối success.
  success(message, duration) { return this.show(message, 'success', duration); },
  // Thực hiện trách nhiệm riêng của khối error.
  error(message, duration) { return this.show(message, 'error', duration); },
  // Thực hiện trách nhiệm riêng của khối warning.
  warning(message, duration) { return this.show(message, 'warning', duration); },
  // Thực hiện trách nhiệm riêng của khối info.
  info(message, duration) { return this.show(message, 'info', duration); }
};
