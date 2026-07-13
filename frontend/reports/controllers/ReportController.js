/**
 * Mục đích: Lớp Controller điều phối sự kiện giao diện và nghiệp vụ báo cáo.
 */
/* CineTicket - Controller báo cáo */
// Lớp ReportController nhận thao tác từ HTTP hoặc giao diện và chuyển chúng tới lớp nghiệp vụ phù hợp.
const ReportController = {
  // Đọc và lọc dữ liệu cần thiết trong khối getSummary.
  async getSummary() {
    return ReportModel.getSummary();
  },

  async getRevenue(days = 30) {
    return API.getAdminRevenue(days);
  }
};
