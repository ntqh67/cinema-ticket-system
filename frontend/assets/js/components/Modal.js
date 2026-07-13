/**
 * Mục đích: Mã nguồn phục vụ khởi tạo và tiện ích dùng chung; các khối bên dưới được giữ tách biệt theo trách nhiệm.
 */
/* CineTicket - Thành phần hộp thoại */
// Đối tượng Modal gom các hành vi có cùng trách nhiệm để các phần khác tái sử dụng.
const Modal = {
  _activeModal: null,
  _resolveConfirm: null,

  // Dựng phần giao diện tương ứng trong khối show.
  show(title, content, options = {}) {
    const { size = '', buttons = [], onClose = null, id = 'main-modal', className = '' } = options;
    this.close();

    const container = document.getElementById('modal-container');
    // Dừng hoặc đổi hướng luồng khi dữ liệu bắt buộc chưa sẵn sàng.
    if (!container) return;

    const buttonsHtml = buttons.length > 0
      ? buttons.map(b => `<button class="btn ${b.class || 'btn-secondary'}" data-modal-action="${b.action || ''}">${b.label}</button>`).join('')
      : `<button class="btn btn-primary" data-modal-action="close">Đóng</button>`;

    container.innerHTML = `
      <div class="modal-overlay" id="${id}">
        <div class="modal-box ${size ? 'modal-' + size : ''} ${className}">
          <div class="modal-header">
            <h4 class="modal-title">${title}</h4>
            <button class="modal-close" data-modal-action="close"><i class="fas fa-times"></i></button>
          </div>
          <div class="modal-body">${typeof content === 'string' ? content : ''}</div>
          ${buttons.length > 0 || !options.hideFooter ? `<div class="modal-footer">${buttonsHtml}</div>` : ''}
        </div>
      </div>`;

    // Dừng hoặc đổi hướng luồng khi dữ liệu bắt buộc chưa sẵn sàng.
    if (typeof content !== 'string') {
      // Chấp nhận trực tiếp phần tử DOM hoặc một hàm dựng nội dung.
    }

    const overlay = container.querySelector('.modal-overlay');
    this._activeModal = overlay;

    // Gắn các hành động dùng để đóng hộp thoại.
    container.querySelectorAll('[data-modal-action]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const action = btn.getAttribute('data-modal-action');
        // Đánh giá điều kiện hiện tại để cập nhật giao diện và trạng thái đúng nhánh.
        if (action === 'close') {
          this.close();
          // Đánh giá điều kiện hiện tại để cập nhật giao diện và trạng thái đúng nhánh.
          if (onClose) onClose();
        } else if (action === 'confirm' && this._resolveConfirm) {
          this._resolveConfirm(true);
          this._resolveConfirm = null;
          this.close();
        } else if (action === 'cancel' && this._resolveConfirm) {
          this._resolveConfirm(false);
          this._resolveConfirm = null;
          this.close();
        }
      });
    });

    // Đóng hộp thoại khi người dùng nhấp vào lớp phủ bên ngoài.
    overlay.addEventListener('click', (e) => {
      // Đánh giá điều kiện hiện tại để cập nhật giao diện và trạng thái đúng nhánh.
      if (e.target === overlay) {
        this.close();
        // Đánh giá điều kiện hiện tại để cập nhật giao diện và trạng thái đúng nhánh.
        if (onClose) onClose();
        // Đánh giá điều kiện hiện tại để cập nhật giao diện và trạng thái đúng nhánh.
        if (this._resolveConfirm) {
          this._resolveConfirm(false);
          this._resolveConfirm = null;
        }
      }
    });

    // Đóng hộp thoại khi người dùng nhấn phím Escape.
    document.addEventListener('keydown', this._escHandler = (e) => {
      // Đánh giá điều kiện hiện tại để cập nhật giao diện và trạng thái đúng nhánh.
      if (e.key === 'Escape') {
        this.close();
        if (onClose) onClose();
        if (this._resolveConfirm) {
          this._resolveConfirm(false);
          this._resolveConfirm = null;
        }
      }
    });

    return overlay;
  },

  // Thực hiện trách nhiệm riêng của khối close.
  close() {
    const container = document.getElementById('modal-container');
    // Đánh giá điều kiện hiện tại để cập nhật giao diện và trạng thái đúng nhánh.
    if (container) container.innerHTML = '';
    this._activeModal = null;
    // Đánh giá điều kiện hiện tại để cập nhật giao diện và trạng thái đúng nhánh.
    if (this._escHandler) {
      document.removeEventListener('keydown', this._escHandler);
      this._escHandler = null;
    }
  },

  // Thực hiện trách nhiệm riêng của khối confirm.
  confirm(message, title = 'Xác Nhận', type = 'warning') {
    return new Promise((resolve) => {
      this._resolveConfirm = resolve;
      const iconMap = { warning: '⚠️', danger: '🗑️', info: 'ℹ️', success: '✅' };
      const content = `
        <div class="modal-confirm-icon ${type}">${iconMap[type] || '⚠️'}</div>
        <p style="text-align:center;color:var(--color-text-muted);">${Helpers.escapeHtml(message)}</p>`;
      this.show(title, content, {
        size: 'sm',
        buttons: [
          { label: 'Hủy', class: 'btn-secondary', action: 'cancel' },
          { label: 'Xác Nhận', class: type === 'danger' ? 'btn-danger' : 'btn-primary', action: 'confirm' }
        ]
      });
    });
  },

  // Thực hiện trách nhiệm riêng của khối alert.
  alert(message, title = 'Thông Báo') {
    return new Promise((resolve) => {
      this._resolveConfirm = (v) => resolve(v);
      this.show(title, `<p style="text-align:center;color:var(--color-text-muted);">${Helpers.escapeHtml(message)}</p>`, {
        size: 'sm',
        buttons: [{ label: 'OK', class: 'btn-primary', action: 'confirm' }]
      });
    });
  }
};
