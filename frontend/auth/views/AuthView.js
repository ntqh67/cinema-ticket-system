/**
 * Mục đích: Lớp View dựng giao diện và cập nhật DOM cho miền xác thực người dùng.
 */
/* CineTicket - View xác thực */
// Đối tượng AuthView đóng vai trò lớp hiển thị, dựng HTML và cập nhật DOM.
const AuthView = {
  activeTab: 'login',

  // Dựng phần giao diện tương ứng trong khối render.
  render() {
    const main = document.getElementById('main-content');
    // Dừng hoặc đổi hướng luồng khi dữ liệu bắt buộc chưa sẵn sàng.
    if (!main) return;
    main.innerHTML = this._renderPage();
    document.getElementById('footer').style.display = 'none';
    this._bindEvents();
  },

  // Dựng phần giao diện tương ứng trong khối _renderPage.
  _renderPage() {
    return `
    <div class="auth-page">
      <div class="auth-left">
        <div class="auth-left-bg" style="background-image:url('https://picsum.photos/seed/authbg/800/1200');background-size:cover;"></div>
        <div class="auth-left-overlay"></div>
        <div class="auth-left-content">
          <div class="auth-left-logo">
            <div class="auth-left-logo-icon"><i class="fas fa-film"></i></div>
            <span class="auth-left-logo-text">CR<span>Ticket</span></span>
          </div>
          <div class="auth-quote">
            <p class="auth-quote-text">"Điện ảnh không chỉ là nghệ thuật — đó là cánh cửa dẫn vào những thế giới chưa từng biết đến."</p>
            <span class="auth-quote-author">— CRTicket</span>
          </div>
          <div class="auth-features">
            <div class="auth-feature-item">
              <div class="auth-feature-icon"><i class="fas fa-ticket-alt"></i></div>
              <span>Đặt vé nhanh chóng, thanh toán tiện lợi</span>
            </div>
            <div class="auth-feature-item">
              <div class="auth-feature-icon"><i class="fas fa-couch"></i></div>
              <span>Chọn chỗ ngồi yêu thích trực tiếp</span>
            </div>
            <div class="auth-feature-item">
              <div class="auth-feature-icon"><i class="fas fa-tags"></i></div>
              <span>Nhiều ưu đãi hấp dẫn dành cho thành viên</span>
            </div>
          </div>
        </div>
      </div>
      <div class="auth-right">
        <div class="auth-form-wrapper">
          <div class="auth-tabs">
            <button class="auth-tab ${this.activeTab === 'login' ? 'active' : ''}" onclick="AuthView.switchTab('login')">Đăng Nhập</button>
            <button class="auth-tab ${this.activeTab === 'register' ? 'active' : ''}" onclick="AuthView.switchTab('register')">Đăng Ký</button>
          </div>
          <div id="auth-form-container">
            ${this.activeTab === 'login' ? this._renderLoginForm() : this._renderRegisterForm()}
          </div>
        </div>
      </div>
    </div>`;
  },

  // Dựng phần giao diện tương ứng trong khối _renderLoginForm.
  _renderLoginForm() {
    return `
    <h2 class="auth-form-title">Chào Mừng Trở Lại!</h2>
    <p class="auth-form-subtitle">Đăng nhập để tiếp tục trải nghiệm điện ảnh</p>
    <form id="login-form" onsubmit="AuthController.handleLogin(event)" novalidate>
      <div class="form-group">
        <label class="form-label" for="login-email">Tên đăng nhập hoặc Email</label>
        <input type="text" class="form-control" id="login-email" placeholder="admin, staff, customer" autocomplete="username" />
        <span class="form-error" id="login-email-error"></span>
      </div>
      <div class="form-group">
        <label class="form-label" for="login-password">Mật Khẩu</label>
        <div class="input-group">
          <input type="password" class="form-control" id="login-password" placeholder="Nhập mật khẩu" autocomplete="current-password" />
          <span class="input-toggle-btn" onclick="AuthView.togglePassword('login-password', this)"><i class="fas fa-eye"></i></span>
        </div>
        <span class="form-error" id="login-password-error"></span>
      </div>
      <div class="form-row-between">
        <label class="form-check">
          <input type="checkbox" id="login-remember" />
          <span style="font-size:0.875rem;">Ghi nhớ đăng nhập</span>
        </label>
        <span class="forgot-link" onclick="AuthView.showForgotPassword()">Quên mật khẩu?</span>
      </div>
      <button type="submit" class="btn btn-primary btn-block btn-lg">
        <i class="fas fa-sign-in-alt"></i> Đăng Nhập
      </button>
    </form>
    <div class="divider-text" style="margin:20px 0;">hoặc đăng nhập với</div>
    <div class="social-login">
      <button class="social-btn" onclick="Toast.info('Tính năng đang phát triển')">
        <i class="fab fa-google"></i> Google
      </button>
      <button class="social-btn" onclick="Toast.info('Tính năng đang phát triển')">
        <i class="fab fa-facebook-f"></i> Facebook
      </button>
    </div>
    `;
  },

  // Kiểm tra điều kiện nghiệp vụ trong khối _renderRegisterForm trước khi tiếp tục.
  _renderRegisterForm() {
    return `
    <h2 class="auth-form-title">Tạo Tài Khoản Mới</h2>
    <p class="auth-form-subtitle">Đăng ký để nhận nhiều ưu đãi hấp dẫn</p>
    <form id="register-form" onsubmit="AuthController.handleRegister(event)" novalidate>
      <div class="form-group">
        <label class="form-label" for="reg-name">Họ và Tên</label>
        <input type="text" class="form-control" id="reg-name" placeholder="Nguyễn Văn A" autocomplete="name" />
        <span class="form-error" id="reg-name-error"></span>
      </div>
      <div class="form-group">
        <label class="form-label" for="reg-email">Email</label>
        <input type="email" class="form-control" id="reg-email" placeholder="example@email.com" autocomplete="email" />
        <span class="form-error" id="reg-email-error"></span>
      </div>
      <div class="form-group">
        <label class="form-label" for="reg-phone">Số Điện Thoại <span style="color:var(--color-text-muted)">(tuỳ chọn)</span></label>
        <input type="tel" class="form-control" id="reg-phone" placeholder="0901234567" autocomplete="tel" />
        <span class="form-error" id="reg-phone-error"></span>
      </div>
      <div class="form-group">
        <label class="form-label" for="reg-password">Mật Khẩu</label>
        <div class="input-group">
          <input type="password" class="form-control" id="reg-password" placeholder="Ít nhất 6 ký tự" autocomplete="new-password" oninput="AuthView.checkPasswordStrength(this.value)" />
          <span class="input-toggle-btn" onclick="AuthView.togglePassword('reg-password', this)"><i class="fas fa-eye"></i></span>
        </div>
        <div class="password-strength">
          <div class="strength-bar"><div class="strength-fill" id="strength-fill" style="width:0%"></div></div>
          <span class="strength-text" id="strength-text"></span>
        </div>
        <span class="form-error" id="reg-password-error"></span>
      </div>
      <div class="form-group">
        <label class="form-label" for="reg-confirm">Xác Nhận Mật Khẩu</label>
        <div class="input-group">
          <input type="password" class="form-control" id="reg-confirm" placeholder="Nhập lại mật khẩu" autocomplete="new-password" />
          <span class="input-toggle-btn" onclick="AuthView.togglePassword('reg-confirm', this)"><i class="fas fa-eye"></i></span>
        </div>
        <span class="form-error" id="reg-confirm-error"></span>
      </div>
      <div class="form-group">
        <label class="form-check">
          <input type="checkbox" id="reg-terms" />
          <span style="font-size:0.875rem;">Tôi đồng ý với <span style="color:var(--color-primary);cursor:pointer;">Điều Khoản Sử Dụng</span> và <span style="color:var(--color-primary);cursor:pointer;">Chính Sách Bảo Mật</span></span>
        </label>
        <span class="form-error" id="reg-terms-error"></span>
      </div>
      <button type="submit" class="btn btn-primary btn-block btn-lg">
        <i class="fas fa-user-plus"></i> Đăng Ký Ngay
      </button>
    </form>
    <div class="divider-text" style="margin:20px 0;">hoặc đăng ký với</div>
    <div class="social-login">
      <button class="social-btn" onclick="Toast.info('Tính năng đang phát triển')">
        <i class="fab fa-google"></i> Google
      </button>
      <button class="social-btn" onclick="Toast.info('Tính năng đang phát triển')">
        <i class="fab fa-facebook-f"></i> Facebook
      </button>
    </div>`;
  },

  // Thực hiện trách nhiệm riêng của khối switchTab.
  switchTab(tab) {
    this.activeTab = tab;
    const container = document.getElementById('auth-form-container');
    const tabs = document.querySelectorAll('.auth-tab');
    tabs.forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.auth-tab').forEach((t, i) => {
      // Đánh giá điều kiện hiện tại để cập nhật giao diện và trạng thái đúng nhánh.
      if ((i === 0 && tab === 'login') || (i === 1 && tab === 'register')) t.classList.add('active');
    });
    // Đánh giá điều kiện hiện tại để cập nhật giao diện và trạng thái đúng nhánh.
    if (container) {
      container.innerHTML = tab === 'login' ? this._renderLoginForm() : this._renderRegisterForm();
    }
    document.getElementById('footer').style.display = 'none';
  },

  // Điều phối sự kiện và phản hồi người dùng trong khối _bindEvents.
  _bindEvents() {
    // Hiển thị lại chân trang khi người dùng rời các trang xác thực.
    document.getElementById('footer').style.display = 'none';
  },

  // Cập nhật trạng thái hoặc dữ liệu trong khối togglePassword.
  togglePassword(inputId, btn) {
    const input = document.getElementById(inputId);
    // Dừng hoặc đổi hướng luồng khi dữ liệu bắt buộc chưa sẵn sàng.
    if (!input) return;
    const isHidden = input.type === 'password';
    input.type = isHidden ? 'text' : 'password';
    const icon = btn.querySelector('i');
    // Đánh giá điều kiện hiện tại để cập nhật giao diện và trạng thái đúng nhánh.
    if (icon) { icon.className = isHidden ? 'fas fa-eye-slash' : 'fas fa-eye'; }
  },

  // Kiểm tra điều kiện nghiệp vụ trong khối checkPasswordStrength trước khi tiếp tục.
  checkPasswordStrength(password) {
    const fill = document.getElementById('strength-fill');
    const text = document.getElementById('strength-text');
    // Dừng hoặc đổi hướng luồng khi dữ liệu bắt buộc chưa sẵn sàng.
    if (!fill || !text) return;
    let strength = 0;
    // Xử lý riêng trường hợp danh sách rỗng hoặc có số lượng không hợp lệ.
    if (password.length >= 6) strength++;
    // Xử lý riêng trường hợp danh sách rỗng hoặc có số lượng không hợp lệ.
    if (password.length >= 10) strength++;
    // Đánh giá điều kiện hiện tại để cập nhật giao diện và trạng thái đúng nhánh.
    if (/[A-Z]/.test(password)) strength++;
    // Đánh giá điều kiện hiện tại để cập nhật giao diện và trạng thái đúng nhánh.
    if (/[0-9]/.test(password)) strength++;
    // Đánh giá điều kiện hiện tại để cập nhật giao diện và trạng thái đúng nhánh.
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    const levels = [
      { width: '0%', color: '', label: '' },
      { width: '20%', color: '#dc3545', label: 'Rất yếu' },
      { width: '40%', color: '#fd7e14', label: 'Yếu' },
      { width: '60%', color: '#ffc107', label: 'Trung bình' },
      { width: '80%', color: '#20c997', label: 'Mạnh' },
      { width: '100%', color: '#28a745', label: 'Rất mạnh' }
    ];
    const level = levels[Math.min(strength, 5)];
    fill.style.width = level.width;
    fill.style.background = level.color;
    text.textContent = level.label;
    text.style.color = level.color;
  },

  // Dựng phần giao diện tương ứng trong khối showForgotPassword.
  showForgotPassword() {
    const content = `
      <p style="color:var(--color-text-muted);margin-bottom:20px;">Nhập email của bạn để nhận link đặt lại mật khẩu.</p>
      <form id="forgot-form" onsubmit="AuthController.handleForgotPassword(event)">
        <div class="form-group">
          <label class="form-label">Email</label>
          <input type="email" class="form-control" id="forgot-email" placeholder="example@email.com" />
        </div>
        <button type="submit" class="btn btn-primary btn-block">Gửi Link Đặt Lại</button>
      </form>`;
    Modal.show('Quên Mật Khẩu', content, { size: 'sm' });
  },

  // Xử lý việc gỡ bỏ, hủy hoặc giải phóng dữ liệu trong khối clearErrors.
  clearErrors(form) {
    // Dừng hoặc đổi hướng luồng khi dữ liệu bắt buộc chưa sẵn sàng.
    if (!form) return;
    form.querySelectorAll('.form-control').forEach(el => el.classList.remove('error', 'success'));
    form.querySelectorAll('.form-error').forEach(el => el.textContent = '');
  },

  // Dựng phần giao diện tương ứng trong khối showErrors.
  showErrors(form, errors, fieldMap) {
    // Duyệt danh sách để dựng hoặc cập nhật từng phần tử giao diện.
    for (const [field, errorMsg] of Object.entries(errors)) {
      const selector = fieldMap[field];
      // Dừng hoặc đổi hướng luồng khi dữ liệu bắt buộc chưa sẵn sàng.
      if (!selector) continue;
      // Kiểm tra kết quả từ backend và chuyển sang nhánh báo lỗi khi cần.
      if (selector.endsWith('-error')) {
        const errEl = form.querySelector(selector) || document.getElementById(selector.replace('#', ''));
        // Kiểm tra kết quả từ backend và chuyển sang nhánh báo lỗi khi cần.
        if (errEl) errEl.textContent = errorMsg;
      } else {
        const input = form.querySelector(selector);
        // Kiểm tra kết quả từ backend và chuyển sang nhánh báo lỗi khi cần.
        if (input) { input.classList.add('error'); }
        const errEl = form.querySelector(selector + '-error') || document.getElementById(selector.replace('#','') + '-error');
        if (errEl) errEl.textContent = errorMsg;
      }
    }
  }
};
