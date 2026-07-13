/**
 * Mục đích: Lớp Model phía trình duyệt, chịu trách nhiệm đọc/ghi dữ liệu báo cáo.
 */
/* CineTicket - Model báo cáo */
// Đối tượng ReportModel đóng vai trò lớp dữ liệu của frontend MVC.
const ReportModel = {
  // Đọc và lọc dữ liệu cần thiết trong khối getSummary.
  async getSummary() {
    return API.getAdminDashboard();
  }
};
