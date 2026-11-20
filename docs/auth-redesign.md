# Thiết kế lại xác thực (chuyển từ identity-service sang NestJS)

Nguồn tham khảo: `PBL5/TUTOR/tutor-net/services/identity-service` (Java/Spring).
Giữ nguyên modular monolith, Prisma, PostgreSQL. Không thêm microservice, JWKS, gRPC, outbox.

## 1. Mô hình token

| Loại | Định dạng | Thời hạn | Lưu trữ |
|---|---|---|---|
| Access token | JWT HS256: `sub`, `sid`, `authVersion`, `role`, `iat`, `exp`, `jti` | 10 phút | Không lưu |
| Refresh token | Chuỗi ngẫu nhiên 32 byte (base64url) | 7 ngày cố định theo family | Chỉ lưu SHA-256 |

- `AuthSession` đóng vai "family" (`sid`): một lần đăng nhập = một family.
- Mỗi request vẫn kiểm tra DB: family chưa thu hồi, user `isActive`, `authVersion` khớp.
  Nhờ đó logout hoặc đổi mật khẩu có hiệu lực ngay, không đợi access token hết hạn.

## 2. Thay đổi schema Prisma

- `User.authVersion Int @default(0)`: tăng khi đổi/đặt lại mật khẩu để vô hiệu mọi phiên.
- `AuthSession`: bỏ `tokenHash` (không còn token opaque dài hạn), giữ `expiresAt`, `revokedAt`, `lastUsedAt`.
- Bảng mới `RefreshToken`: `id`, `sessionId` (FK, cascade), `tokenHash` (unique), `expiresAt`, `consumedAt`, `createdAt`.
- Index: `sessionId`, `expiresAt`.
- Migration Prisma mới; phiên cũ bị thu hồi (người dùng đăng nhập lại một lần).

## 3. Luồng

- **Đăng ký / đăng nhập:** tạo `AuthSession` + `RefreshToken` đầu tiên trong một transaction, trả `accessToken` và `refreshToken`.
- **Refresh (xoay vòng):** trong transaction, khóa dòng family rồi đọc lại token.
  Token hợp lệ và chưa tiêu thì đánh dấu `consumedAt`, tạo token mới. Hạn family không được kéo dài.
  Token đã tiêu mà bị dùng lại thì thu hồi cả family và trả 401 (phát hiện đánh cắp). Việc thu hồi phải được commit dù trả lỗi.
- **Logout:** thu hồi cả family, luôn trả 204 kể cả token không tồn tại.
- **Đổi mật khẩu:** băm mật khẩu mới, tăng `authVersion`, thu hồi mọi family của user, cùng một transaction.
- **Quên mật khẩu qua email:** để giai đoạn sau (cần gửi mail). Chưa làm trong đợt này.

## 4. Chống lạm dụng

- Rate limit bằng `@nestjs/throttler` cho `login`, `register`, `refresh`: trả 429 kèm `Retry-After`.
- Job `@nestjs/schedule` chạy mỗi phút: xóa tối đa 500 dòng `RefreshToken`/`AuthSession` đã hết hạn mỗi lần.
- Login sai luôn trả cùng một thông báo, không tiết lộ tài khoản có tồn tại hay không.

## 5. Cấu hình

`.env.example` thêm: `JWT_ACCESS_SECRET` (bắt buộc, >= 32 ký tự, ứng dụng không khởi động nếu thiếu),
`JWT_ACCESS_TTL=600`, `REFRESH_TTL_DAYS=7`.

## 6. Phạm vi code

- `backend/src/auth/`: `auth.service.ts` (tách thêm `token.service.ts` cho JWT và refresh), `auth.controller.ts` (`POST /auth/refresh`, `POST /auth/change-password`), `AuthGuard` đọc JWT thay vì tra hash.
- `backend/src/auth/auth-cleanup.job.ts`: job dọn token.
- Frontend `frontend/assets/js/utils/api.js`: lưu `refreshToken`, tự gọi refresh khi gặp 401 (tuần tự hóa các lệnh refresh đồng thời), đăng xuất khi refresh thất bại.
- Giữ nguyên `RolesGuard`, kiểm tra chủ sở hữu booking, và mọi guard/decorator hiện có.

## 7. Kiểm thử

- Unit: xoay vòng refresh, phát hiện dùng lại token, tăng `authVersion` vô hiệu access token, hết hạn.
- E2E: register -> login -> refresh -> logout -> refresh thất bại; rate limit trả 429.
- Chạy `npx prisma validate`, `npm run build`, `npm test` sau mỗi bước.

## 8. Thứ tự triển khai

1. Schema + migration + cấu hình.
2. Token service + login/register/refresh/logout.
3. Guard dùng JWT + đổi mật khẩu.
4. Rate limit + job dọn.
5. Frontend tự refresh.
6. Test và cập nhật tài liệu.

## 9. Điểm cần lưu ý

- Hai request refresh đồng thời có thể làm một request bị thu hồi oan; frontend phải gọi tuần tự (identity-service ghi nhận cùng giới hạn này).
- Access token có DB check mỗi request nên không "stateless" hoàn toàn. Đây là lựa chọn có chủ đích để thu hồi tức thì.
