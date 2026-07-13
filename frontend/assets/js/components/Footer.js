/**
 * Mục đích: Mã nguồn phục vụ khởi tạo và tiện ích dùng chung; các khối bên dưới được giữ tách biệt theo trách nhiệm.
 */
/* CineTicket - Thành phần chân trang */
// Đối tượng Footer gom các hành vi có cùng trách nhiệm để các phần khác tái sử dụng.
const Footer = {
  // Dựng phần giao diện tương ứng trong khối render.
  render() {
    return `
      <div class="container">
        <div class="footer-main">
          <div class="footer-brand">
            <div class="footer-logo" onclick="Router.navigate('/')">
              <div class="footer-logo-icon"><i class="fas fa-film"></i></div>
              <span class="footer-logo-text">CR<span>Ticket</span></span>
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
              <span>Thành phố Đà Nẵng</span>
            </div>
            <div class="footer-contact-item">
              <i class="fas fa-phone"></i>
              <span>19005678</span>
            </div>
            <div class="footer-contact-item">
              <i class="fas fa-envelope"></i>
              <span>support@crticket.vn</span>
            </div>
            <div class="footer-contact-item">
              <i class="fas fa-clock"></i>
              <span>8:00 - 22:00, Thứ 2 - Chủ Nhật</span>
            </div>
          </div>
        </div>
        <div class="footer-bottom">
          <span>© 2025 CRTicket. Tất cả quyền được bảo lưu.</span>
          <div class="footer-bottom-links">
            <span class="footer-bottom-link">Chính Sách Bảo Mật</span>
            <span class="footer-bottom-link">Điều Khoản Sử Dụng</span>
            <span class="footer-bottom-link">Hỗ Trợ</span>
          </div>
        </div>
      </div>`;
  },

  // Thực hiện trách nhiệm riêng của khối mount.
  mount() {
    const footer = document.getElementById('footer');
    // Dừng hoặc đổi hướng luồng khi dữ liệu bắt buộc chưa sẵn sàng.
    if (!footer) return;
    footer.innerHTML = this.render();
  }
};
