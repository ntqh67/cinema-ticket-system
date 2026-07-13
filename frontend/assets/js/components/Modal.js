/* CineTicket - Modal Component */
const Modal = {
  _activeModal: null,
  _resolveConfirm: null,

  show(title, content, options = {}) {
    const { size = '', buttons = [], onClose = null, id = 'main-modal', className = '' } = options;
    this.close();

    const container = document.getElementById('modal-container');
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

    if (typeof content !== 'string') {
      // DOM element or render function
    }

    const overlay = container.querySelector('.modal-overlay');
    this._activeModal = overlay;

    // Bind close actions
    container.querySelectorAll('[data-modal-action]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const action = btn.getAttribute('data-modal-action');
        if (action === 'close') {
          this.close();
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

    // Close on overlay click
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        this.close();
        if (onClose) onClose();
        if (this._resolveConfirm) {
          this._resolveConfirm(false);
          this._resolveConfirm = null;
        }
      }
    });

    // Close on Escape
    document.addEventListener('keydown', this._escHandler = (e) => {
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

  close() {
    const container = document.getElementById('modal-container');
    if (container) container.innerHTML = '';
    this._activeModal = null;
    if (this._escHandler) {
      document.removeEventListener('keydown', this._escHandler);
      this._escHandler = null;
    }
  },

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
