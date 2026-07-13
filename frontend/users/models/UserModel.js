/**
 * Mục đích: Lớp Model phía trình duyệt, chịu trách nhiệm đọc/ghi dữ liệu người dùng.
 */
/* CineTicket - Model người dùng */
// Đối tượng UserModel đóng vai trò lớp dữ liệu của frontend MVC.
const UserModel = {
  // Đọc và lọc dữ liệu cần thiết trong khối getAll.
  getAll() {
    return API.mockData.users.map(({ password, ...u }) => u);
  },

  // Đọc và lọc dữ liệu cần thiết trong khối getById.
  getById(id) {
    const user = API.mockData.users.find(u => u.id === id);
    // Kiểm tra trạng thái đăng nhập hoặc vai trò trước khi cho phép thao tác.
    if (!user) return null;
    const { password, ...safe } = user;
    return safe;
  },

  // Cập nhật trạng thái hoặc dữ liệu trong khối update.
  update(id, data) {
    const idx = API.mockData.users.findIndex(u => u.id === id);
    // Kiểm tra kết quả từ backend và chuyển sang nhánh báo lỗi khi cần.
    if (idx === -1) return { success: false, error: 'Không tìm thấy người dùng' };
    const allowedFields = ['name', 'phone', 'avatar'];
    allowedFields.forEach(f => {
      // Kiểm tra trạng thái đăng nhập hoặc vai trò trước khi cho phép thao tác.
      if (data[f] !== undefined) API.mockData.users[idx][f] = data[f];
    });
    API._save('users');
    const { password, ...safe } = API.mockData.users[idx];
    State.set('currentUser', safe);
    State.persist('currentUser');
    return { success: true, user: safe };
  },

  // Thực hiện trách nhiệm riêng của khối changePassword.
  changePassword(id, currentPassword, newPassword) {
    const user = API.mockData.users.find(u => u.id === id);
    // Kiểm tra trạng thái đăng nhập hoặc vai trò trước khi cho phép thao tác.
    if (!user) return { success: false, error: 'Không tìm thấy người dùng' };
    // Kiểm tra trạng thái đăng nhập hoặc vai trò trước khi cho phép thao tác.
    if (user.password !== currentPassword) return { success: false, error: 'Mật khẩu hiện tại không đúng' };
    // Kiểm tra kết quả từ backend và chuyển sang nhánh báo lỗi khi cần.
    if (newPassword.length < 6) return { success: false, error: 'Mật khẩu mới phải có ít nhất 6 ký tự' };
    user.password = newPassword;
    API._save('users');
    return { success: true, message: 'Đổi mật khẩu thành công' };
  },

  // Đọc và lọc dữ liệu cần thiết trong khối getUserBookings.
  getUserBookings(userId) {
    return [];
  },

  // Đọc và lọc dữ liệu cần thiết trong khối getUserTickets.
  getUserTickets(userId) {
    return [];
  },

  // Xử lý việc gỡ bỏ, hủy hoặc giải phóng dữ liệu trong khối deleteUser.
  deleteUser(id) {
    const idx = API.mockData.users.findIndex(u => u.id === id);
    // Đánh giá điều kiện hiện tại để cập nhật giao diện và trạng thái đúng nhánh.
    if (idx === -1) return { success: false };
    API.mockData.users.splice(idx, 1);
    API._save('users');
    return { success: true };
  },

  // Cập nhật trạng thái hoặc dữ liệu trong khối toggleActive.
  toggleActive(id) {
    const user = API.mockData.users.find(u => u.id === id);
    // Kiểm tra trạng thái đăng nhập hoặc vai trò trước khi cho phép thao tác.
    if (!user) return { success: false };
    user.isActive = !user.isActive;
    API._save('users');
    return { success: true, isActive: user.isActive };
  }
};
