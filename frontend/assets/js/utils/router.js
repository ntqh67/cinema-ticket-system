/**
 * Mục đích: Mã nguồn phục vụ khởi tạo và tiện ích dùng chung; các khối bên dưới được giữ tách biệt theo trách nhiệm.
 */
/* CineTicket - Bộ định tuyến dựa trên hash */
// Đối tượng Router quản lý hash route và vòng đời hiển thị từng trang.
const Router = {
  routes: {},
  currentRoute: null,
  currentParams: {},

  // Kiểm tra điều kiện nghiệp vụ trong khối register trước khi tiếp tục.
  register(path, handler) {
    this.routes[path] = handler;
  },

  // Thực hiện trách nhiệm riêng của khối navigate.
  navigate(path, replaceState = false) {
    // Đánh giá điều kiện hiện tại để cập nhật giao diện và trạng thái đúng nhánh.
    if (replaceState) {
      window.history.replaceState(null, '', '#' + path);
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    } else {
      window.location.hash = path;
    }
  },

  // Khởi tạo luồng init và chuẩn bị các phụ thuộc cần thiết.
  init() {
    window.addEventListener('hashchange', () => this._handleRoute());
    window.addEventListener('load', () => this._handleRoute());
    this._handleRoute();
  },

  // Điều phối sự kiện và phản hồi người dùng trong khối _handleRoute.
  _handleRoute() {
    const hash = window.location.hash || '#/';
    const path = hash.replace(/^#/, '').split('?')[0] || '/';

    // Gỡ trạng thái trang quản trị trước khi xác định route mới.
    document.body.classList.remove('admin-layout');

    // Ưu tiên route tĩnh khớp hoàn toàn để tránh bị route động bắt nhầm.
    // Đánh giá điều kiện hiện tại để cập nhật giao diện và trạng thái đúng nhánh.
    if (this.routes[path]) {
      this.currentRoute = path;
      this.currentParams = {};
      // Bắt đầu thao tác có thể thất bại để hiển thị phản hồi phù hợp cho người dùng.
      try { this.routes[path]({}); } catch (e) { console.error('Route handler error:', e); this._renderError(e); }
      this._scrollTop();
      return;
    }

    // Nếu chưa khớp, thử route động, ví dụ /movies/:id.
    // Duyệt danh sách để dựng hoặc cập nhật từng phần tử giao diện.
    for (const routePath in this.routes) {
      const params = this._matchRoute(routePath, path);
      // Dừng hoặc đổi hướng luồng khi dữ liệu bắt buộc chưa sẵn sàng.
      if (params !== null) {
        this.currentRoute = routePath;
        this.currentParams = params;
        // Bắt đầu thao tác có thể thất bại để hiển thị phản hồi phù hợp cho người dùng.
        try { this.routes[routePath](params); } catch (e) { console.error('Route handler error:', e); this._renderError(e); }
        this._scrollTop();
        return;
      }
    }

    this.notFound();
  },

  // Thực hiện trách nhiệm riêng của khối _matchRoute.
  _matchRoute(pattern, path) {
    const patternParts = pattern.split('/').filter(Boolean);
    const pathParts = path.split('/').filter(Boolean);
    // Xử lý riêng trường hợp danh sách rỗng hoặc có số lượng không hợp lệ.
    if (patternParts.length !== pathParts.length) return null;
    const params = {};
    // Duyệt danh sách để dựng hoặc cập nhật từng phần tử giao diện.
    for (let i = 0; i < patternParts.length; i++) {
      // Đánh giá điều kiện hiện tại để cập nhật giao diện và trạng thái đúng nhánh.
      if (patternParts[i].startsWith(':')) {
        params[patternParts[i].slice(1)] = decodeURIComponent(pathParts[i]);
      } else if (patternParts[i] !== pathParts[i]) {
        return null;
      }
    }
    return params;
  },

  // Thực hiện trách nhiệm riêng của khối notFound.
  notFound() {
    const main = document.getElementById('main-content');
    // Đánh giá điều kiện hiện tại để cập nhật giao diện và trạng thái đúng nhánh.
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

  // Dựng phần giao diện tương ứng trong khối _renderError.
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

  // Thực hiện trách nhiệm riêng của khối _scrollTop.
  _scrollTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
};
