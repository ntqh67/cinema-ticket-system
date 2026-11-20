// Cấu hình nghiệp vụ xác thực dùng chung trong miền auth.
export const ACCESS_TTL_SECONDS_DEFAULT = 600;
export const REFRESH_TTL_DAYS_DEFAULT = 7;
export const PASSWORD_RESET_TTL_MINUTES_DEFAULT = 30;
export const SESSION_TOUCH_INTERVAL_MS = 5 * 60 * 1000;
// Mỗi lần chạy job dọn dẹp xóa tối đa số dòng này cho từng bảng token.
export const CLEANUP_BATCH_SIZE = 500;
export const JWT_SECRET_MIN_LENGTH = 32;
// Chu kỳ chạy job dọn token hết hạn.
export const CLEANUP_INTERVAL_MS = 60 * 1000;
