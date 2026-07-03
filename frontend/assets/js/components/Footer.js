/* CineTicket - Footer Component */
const Footer = {
  render() {
    return `
      <div class="container">
        <div class="footer-main">
          <div class="footer-brand">
            <div class="footer-logo" onclick="Router.navigate('/')">
              <div class="footer-logo-icon"><i class="fas fa-film"></i></div>
              <span class="footer-logo-text">Cine<span>Ticket</span></span>
            </div>
            <p class="footer-desc">Hệ thống đặt vé rạp chiếu phim trực tuyến hàng đầu Việt Nam. Trải nghiệm điện ảnh đỉnh cao với hàng trăm suất chiếu mỗi ngày.</p>
            <div class="footer-social">
              <div class="footer-social-btn" title="Facebook"><i class="fab fa-facebook-f"></i></div>
              <div class="footer-social-btn" title="Instagram"><i class="fab fa-instagram"></i></div>
              <div class="footer-social-btn" title="YouTube"><i class="fab fa-youtube"></i></div>
              <div class="footer-social-btn" title="TikTok"><i class="fab fa-tiktok"></i></div>
            </div>
          </div>
          <div>
            <h5 class="footer-col-title">Khám Phá</h5>
            <div class="footer-links">
              <span class="footer-link" onclick="Router.navigate('/')"><i class="fas fa-chevron-right"></i> Trang Chủ</span>
              <span class="footer-link" onclick="Router.navigate('/movies')"><i class="fas fa-chevron-right"></i> Phim Đang Chiếu</span>
              <span class="footer-link" onclick="Router.navigate('/movies?status=comingSoon')"><i class="fas fa-chevron-right"></i> Phim Sắp Chiếu</span>
              <span class="footer-link" onclick="Router.navigate('/cinemas')"><i class="fas fa-chevron-right"></i> Rạp Chiếu Phim</span>
              <span class="footer-link" onclick="Router.navigate('/promotions')"><i class="fas fa-chevron-right"></i> Khuyến Mãi</span>
            </div>
          </div>
          <div>
            <h5 class="footer-col-title">Tài Khoản</h5>
            <div class="footer-links">
              <span class="footer-link" onclick="Router.navigate('/login')"><i class="fas fa-chevron-right"></i> Đăng Nhập</span>
              <span class="footer-link" onclick="Router.navigate('/login')"><i class="fas fa-chevron-right"></i> Đăng Ký</span>
              <span class="footer-link" onclick="Router.navigate('/profile')"><i class="fas fa-chevron-right"></i> Hồ Sơ Cá Nhân</span>
              <span class="footer-link" onclick="Router.navigate('/history')"><i class="fas fa-chevron-right"></i> Lịch Sử Đặt Vé</span>
            </div>
          </div>
          <div>
            <h5 class="footer-col-title">Liên Hệ</h5>
            <div class="footer-contact-item">
              <i class="fas fa-map-marker-alt"></i>
              <span>72 Lê Thánh Tôn, Q.1, TP. Hồ Chí Minh</span>
            </div>
            <div class="footer-contact-item">
              <i class="fas fa-phone"></i>
              <span>1900 6017</span>
            </div>
            <div class="footer-contact-item">
              <i class="fas fa-envelope"></i>
              <span>support@cineticket.vn</span>
            </div>
            <div class="footer-contact-item">
              <i class="fas fa-clock"></i>
              <span>8:00 - 22:00, Thứ 2 - Chủ Nhật</span>
            </div>
          </div>
        </div>
        <div class="footer-bottom">
          <span>© 2025 CineTicket. Tất cả quyền được bảo lưu.</span>
          <div class="footer-bottom-links">
            <span class="footer-bottom-link">Chính Sách Bảo Mật</span>
            <span class="footer-bottom-link">Điều Khoản Sử Dụng</span>
            <span class="footer-bottom-link">Hỗ Trợ</span>
          </div>
        </div>
      </div>`;
  },

  mount() {
    const footer = document.getElementById('footer');
    if (!footer) return;
    footer.innerHTML = this.render();
  }
};
