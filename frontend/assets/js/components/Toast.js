/* CineTicket - Toast Notifications */
const Toast = {
  container: null,
  queue: [],

  _getContainer() {
    if (!this.container) {
      this.container = document.getElementById('toast-container');
    }
    return this.container;
  },

  show(message, type = 'info', duration = 4000) {
    const container = this._getContainer();
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

    // Animate progress bar
    if (duration > 0) {
      const pb = document.getElementById(`toast-pb-${id}`);
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

  _remove(id) {
    const toast = document.getElementById(`toast-${id}`);
    if (toast) {
      toast.classList.add('removing');
      setTimeout(() => {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 300);
    }
  },

  success(message, duration) { return this.show(message, 'success', duration); },
  error(message, duration) { return this.show(message, 'error', duration); },
  warning(message, duration) { return this.show(message, 'warning', duration); },
  info(message, duration) { return this.show(message, 'info', duration); }
};
