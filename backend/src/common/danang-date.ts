/**
 * Các hàm định dạng ngày và giờ thống nhất theo múi giờ Đà Nẵng.
 * Tách riêng để mọi service trả dữ liệu lịch chiếu theo cùng một quy ước.
 */

const DA_NANG_TIME_ZONE = 'Asia/Ho_Chi_Minh';

// Chuyển một thời điểm thành ngày ISO cục bộ YYYY-MM-DD tại Đà Nẵng.
export function formatDateInDaNang(value: Date) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: DA_NANG_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(value);
}

// Chuyển một thời điểm thành giờ 24 tiếng HH:mm tại Đà Nẵng.
export function formatTimeInDaNang(value: Date) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: DA_NANG_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(value);
}
