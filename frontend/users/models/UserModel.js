/* CRTicket - User Model */
const UserModel = {
  getAll() {
    return API.mockData.users.map(({ password, ...u }) => u);
  },

  getById(id) {
    const user = API.mockData.users.find(u => u.id === id);
    if (!user) return null;
    const { password, ...safe } = user;
    return safe;
  },

  async update(id, data) {
    try {
      const response = await API.updateUserProfile(id, data);
      const safe = response.user;
      State.set('currentUser', safe);
      State.persist('currentUser');
      return { success: true, user: safe };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Không thể cập nhật thông tin người dùng',
      };
    }
  },

  changePassword(id, currentPassword, newPassword) {
    const user = API.mockData.users.find(u => u.id === id);
    if (!user) return { success: false, error: 'Không tìm thấy người dùng' };
    if (user.password !== currentPassword) return { success: false, error: 'Mật khẩu hiện tại không đúng' };
    if (newPassword.length < 6) return { success: false, error: 'Mật khẩu mới phải có ít nhất 6 ký tự' };
    user.password = newPassword;
    API._save('users');
    return { success: true, message: 'Đổi mật khẩu thành công' };
  },

  getUserBookings(userId) {
    return [];
  },

  getUserTickets(userId) {
    return [];
  },

  deleteUser(id) {
    const idx = API.mockData.users.findIndex(u => u.id === id);
    if (idx === -1) return { success: false };
    API.mockData.users.splice(idx, 1);
    API._save('users');
    return { success: true };
  },

  toggleActive(id) {
    const user = API.mockData.users.find(u => u.id === id);
    if (!user) return { success: false };
    user.isActive = !user.isActive;
    API._save('users');
    return { success: true, isActive: user.isActive };
  }
};
