/* CineTicket - Concession View */
const ConcessionView = {
  _combos: [],

  async renderAdmin() {
    if (!AuthController.requireAdmin()) return;
    document.body.classList.add('admin-layout');
    const main = document.getElementById('main-content');
    if (!main) return;

    let combos = [];
    try {
      combos = await API.getAdminConcessionCombos();
    } catch (error) {
      Toast.error(error.message || 'Khong the tai combo');
    }
    this._combos = combos;

    main.innerHTML = `
    <div class="admin-layout-wrap">
      ${UserView._renderAdminSidebar('concessions')}
      <div class="admin-main">
        ${UserView._renderAdminTopbar('Quan Ly Combo Bap Nuoc', 'admin/concessions')}
        <div class="admin-content">
          <div class="admin-page-header">
            <div>
              <h1 class="admin-page-title">Combo Bap Nuoc</h1>
              <p class="admin-page-subtitle">${combos.length} combo trong he thong</p>
            </div>
            <button class="btn btn-primary" onclick="ConcessionView.showForm()"><i class="fas fa-plus"></i> Them Combo</button>
          </div>
          <div class="data-table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Combo</th>
                  <th>Mo Ta</th>
                  <th>Gia</th>
                  <th>Trang Thai</th>
                  <th>Thao Tac</th>
                </tr>
              </thead>
              <tbody>
                ${combos.map((combo) => this._row(combo)).join('') || '<tr><td colspan="5" class="empty-cell">Chua co combo</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>`;
  },

  _row(combo) {
    return `
      <tr>
        <td>
          <div style="display:flex;align-items:center;gap:10px;">
            <img src="${Helpers.escapeHtml(combo.imageUrl || API.moviePosterFallback)}" alt="" style="width:48px;height:48px;object-fit:cover;border-radius:6px;" onerror="this.src=API.moviePosterFallback" />
            <strong>${Helpers.escapeHtml(combo.name)}</strong>
          </div>
        </td>
        <td>${Helpers.escapeHtml(combo.description || '')}</td>
        <td>${Helpers.formatCurrency(Number(combo.price))}</td>
        <td><span class="badge ${combo.isActive ? 'badge-success' : 'badge-secondary'}">${combo.isActive ? 'Dang ban' : 'Da an'}</span></td>
        <td>
          <div class="table-actions">
            <button class="action-btn edit" onclick="ConcessionView.showFormById('${combo.id}')"><i class="fas fa-edit"></i></button>
            <button class="action-btn delete" onclick="ConcessionController.handleDelete('${combo.id}')"><i class="fas fa-trash"></i></button>
          </div>
        </td>
      </tr>`;
  },

  showFormById(comboId) {
    const combo = this._combos.find((item) => item.id === comboId);
    this.showForm(combo || null);
  },

  showForm(combo = null) {
    const isEdit = Boolean(combo);
    const content = `
      <form id="combo-form" onsubmit="ConcessionController.handleSave(event, ${isEdit ? `'${combo.id}'` : 'null'})">
        <div class="form-group">
          <label class="form-label">Ten Combo</label>
          <input class="form-control" id="combo-name" value="${Helpers.escapeHtml(combo?.name || '')}" required />
        </div>
        <div class="form-group">
          <label class="form-label">Mo Ta</label>
          <textarea class="form-control" id="combo-description" rows="3">${Helpers.escapeHtml(combo?.description || '')}</textarea>
        </div>
        <div class="form-group">
          <label class="form-label">Gia (VND)</label>
          <input class="form-control" id="combo-price" type="number" min="0" step="1000" value="${Number(combo?.price || 0)}" required />
        </div>
        <div class="form-group">
          <label class="form-label">Anh Combo</label>
          <input class="form-control" id="combo-image" value="${Helpers.escapeHtml(combo?.imageUrl || '')}" />
        </div>
        <label style="display:flex;align-items:center;gap:8px;">
          <input type="checkbox" id="combo-active" ${combo?.isActive === false ? '' : 'checked'} />
          Dang ban
        </label>
        <button type="submit" class="btn btn-primary btn-block" style="margin-top:18px;">Luu Combo</button>
      </form>`;
    Modal.show(isEdit ? 'Sua Combo' : 'Them Combo', content, { size: 'md' });
  },
};
