/* CineTicket - Hash-Based Router */
const Router = {
  routes: {},
  currentRoute: null,
  currentParams: {},

  register(path, handler) {
    this.routes[path] = handler;
  },

  navigate(path, replaceState = false) {
    if (replaceState) {
      window.history.replaceState(null, '', '#' + path);
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    } else {
      window.location.hash = path;
    }
  },

  init() {
    window.addEventListener('hashchange', () => this._handleRoute());
    window.addEventListener('load', () => this._handleRoute());
    this._handleRoute();
  },

  _handleRoute() {
    const hash = window.location.hash || '#/';
    const path = hash.replace(/^#/, '').split('?')[0] || '/';

    // Reset admin body class
    document.body.classList.remove('admin-layout');

    // Try exact match first
    if (this.routes[path]) {
      this.currentRoute = path;
      this.currentParams = {};
      try { this.routes[path]({}); } catch (e) { console.error('Route handler error:', e); this._renderError(e); }
      this._scrollTop();
      return;
    }

    // Try dynamic match (e.g. /movies/:id)
    for (const routePath in this.routes) {
      const params = this._matchRoute(routePath, path);
      if (params !== null) {
        this.currentRoute = routePath;
        this.currentParams = params;
        try { this.routes[routePath](params); } catch (e) { console.error('Route handler error:', e); this._renderError(e); }
        this._scrollTop();
        return;
      }
    }

    this.notFound();
  },

  _matchRoute(pattern, path) {
    const patternParts = pattern.split('/').filter(Boolean);
    const pathParts = path.split('/').filter(Boolean);
    if (patternParts.length !== pathParts.length) return null;
    const params = {};
    for (let i = 0; i < patternParts.length; i++) {
      if (patternParts[i].startsWith(':')) {
        params[patternParts[i].slice(1)] = decodeURIComponent(pathParts[i]);
      } else if (patternParts[i] !== pathParts[i]) {
        return null;
      }
    }
    return params;
  },

  notFound() {
    const main = document.getElementById('main-content');
    if (main) {
      main.innerHTML = `
        <div class="page-wrapper">
          <div class="container">
            <div class="empty-state" style="padding: 100px 0;">
              <i class="fas fa-film" style="font-size:5rem;color:var(--color-primary);opacity:0.5;margin-bottom:24px;display:block;"></i>
              <h2 style="margin-bottom:12px;">404 - Trang Không Tìm Thấy</h2>
              <p style="color:var(--color-text-muted);margin-bottom:32px;">Trang bạn đang tìm kiếm không tồn tại.</p>
              <button class="btn btn-primary" onclick="Router.navigate('/')">
                <i class="fas fa-home"></i> Về Trang Chủ
              </button>
            </div>
          </div>
        </div>`;
    }
  },

  _renderError(err) {
    const main = document.getElementById('main-content');
    if (main) {
      main.innerHTML = `
        <div class="page-wrapper">
          <div class="container">
            <div class="empty-state">
              <i class="fas fa-exclamation-triangle" style="color:var(--color-danger);"></i>
              <h3>Đã xảy ra lỗi</h3>
              <p>${err.message || 'Unknown error'}</p>
              <button class="btn btn-outline" onclick="Router.navigate('/')">Về Trang Chủ</button>
            </div>
          </div>
        </div>`;
    }
  },

  _scrollTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
};
