# Thanh Toán SePay Cho Booking

Tài liệu này mô tả cấu hình và luồng chạy SePay trong nhánh hiện tại.

## Biến Môi Trường

Copy `.env.example` sang `.env` và điền các biến sau:

```env
SEPAY_ENABLED="true"
SEPAY_BANK_ACCOUNT="SO_TAI_KHOAN_NHAN_TIEN"
SEPAY_BANK_CODE="MA_NGAN_HANG"
SEPAY_ACCOUNT_NAME="TEN_CHU_TAI_KHOAN"
SEPAY_API_KEY="API_KEY_WEBHOOK_CUA_SEPAY"
SEPAY_PAYMENT_PREFIX="CRT"
SEPAY_WEBHOOK_URL="http://localhost:3000/api/bookings/sepay-webhook"
BOOKING_HOLD_MINUTES="10"
```

SePay chỉ hiện là phương thức thanh toán khả dụng khi `SEPAY_ENABLED=true` và đủ tài khoản ngân hàng, mã ngân hàng, tên chủ tài khoản, API key.

## Chạy Hoàn Chỉnh Khi Test Local Bằng Ngrok

### 1. Chạy Docker

```powershell
cd "D:\My Project\Project 4 - Cinema"
docker compose up -d
```

### 2. Đồng bộ Prisma/database

```powershell
cd "D:\My Project\Project 4 - Cinema"
npx.cmd prisma generate
npx.cmd prisma migrate deploy
```

### 3. Chạy backend

```powershell
cd "D:\My Project\Project 4 - Cinema\backend"
npm.cmd run start:dev
```

Backend phải chạy ở port `3000`.

### 4. Chạy frontend

```powershell
cd "D:\My Project\Project 4 - Cinema\frontend"
npx.cmd vite --host 0.0.0.0
```

Mở:

```text
http://localhost:5173
```

### 5. Chạy ngrok

```powershell
ngrok http 3000
```

Nếu PowerShell không nhận `ngrok`, đóng terminal mở lại. Nếu ngrok báo version cũ, chạy:

```powershell
ngrok update
```

Khi chạy thành công, ngrok sẽ hiện URL dạng:

```text
https://xxxxx.ngrok-free.dev -> http://localhost:3000
```

### 6. Kiểm tra ngrok đã nối backend

Mở URL:

```text
https://xxxxx.ngrok-free.dev/api/bookings/payment-methods
```

Kết quả đúng là JSON có:

```json
{
  "methods": [
    { "id": "sepay", "enabled": true, "mode": "live" }
  ]
}
```

Nếu vào `/` thấy `Cannot GET /` thì không sao, vì backend không khai báo route gốc. Cần test đúng route `/api/bookings/payment-methods`.

### 7. Cấu hình webhook trong SePay

Trong SePay Dashboard, thêm webhook:

- Tên webhook: `CRTicket Booking Payment`
- URL nhận webhook:

```text
https://xxxxx.ngrok-free.dev/api/bookings/sepay-webhook
```

- Loại giao dịch: `Tiền vào`
- Định dạng dữ liệu: `JSON`
- Bảo mật: `API Key`
- API key: dùng đúng giá trị `SEPAY_API_KEY` trong `.env`

Nếu SePay cho nhập header đầy đủ, cấu hình:

```text
Authorization: Apikey <SEPAY_API_KEY>
```

### 8. Theo dõi webhook

Mở ngrok inspector:

```text
http://127.0.0.1:4040
```

Khi SePay gửi webhook đúng, sẽ thấy request:

```text
POST /api/bookings/sepay-webhook
```

Ý nghĩa status:

- `200`: backend nhận webhook.
- `401`: sai API key hoặc SePay gửi header khác backend mong đợi.
- Không có request: SePay chưa gửi webhook hoặc URL webhook đang sai.
- `200` nhưng payment không thành công: kiểm tra response/payload, thường là sai số tiền, sai nội dung chuyển khoản hoặc booking đã hết hạn.

## Luồng Test SePay Thành Công

1. Đăng nhập trên web.
2. Chọn phim.
3. Chọn suất chiếu.
4. Chọn ghế.
5. Chọn hoặc bỏ qua combo bắp nước.
6. Vào thanh toán.
7. Chọn `SePay QR`.
8. Bấm xác nhận thanh toán.
9. Quét QR và chuyển khoản đúng:
   - đúng số tiền;
   - đúng nội dung chuyển khoản dạng `CRT...`.
10. Chờ SePay gửi webhook về backend.
11. Frontend polling `GET /api/bookings/:bookingId/payment-status` và tự chuyển sang trang vé khi payment thành công.

Kết quả đúng trong database:

- `payments.status = SUCCESS`
- `bookings.status = PAID`
- `showtime_seats.status = BOOKED`
- bảng `tickets` có vé mới
- bảng `payment_webhook_events` có log webhook `PROCESSED`

## Test Nhanh Bằng Webhook Giả

Khi chưa muốn chuyển khoản thật, có thể copy số tiền và nội dung `CRT...` đang hiện trên QR rồi gọi:

```powershell
$headers = @{ Authorization = "Apikey <SEPAY_API_KEY>" }
$body = @{
  id = "TXN-TEST-001"
  transferType = "in"
  transferAmount = 180000
  content = "Thanh toan CRT_MA_DANG_HIEN_TREN_QR"
} | ConvertTo-Json

Invoke-RestMethod `
  -Uri "http://localhost:3000/api/bookings/sepay-webhook" `
  -Method Post `
  -Headers $headers `
  -ContentType "application/json" `
  -Body $body
```

Phải thay:

- `transferAmount` bằng đúng số tiền trên QR.
- `CRT_MA_DANG_HIEN_TREN_QR` bằng đúng nội dung chuyển khoản đang hiển thị.

## Lỗi Thường Gặp

### Web đứng mãi ở “Đang chờ SePay xác nhận”

Kiểm tra `http://127.0.0.1:4040`.

- Nếu không có `POST /api/bookings/sepay-webhook`: SePay chưa gọi webhook, thường do URL webhook sai hoặc ngrok đã đổi URL.
- Nếu có request nhưng `401`: sai API key/header.
- Nếu có request `200` nhưng vẫn không có vé: kiểm tra bảng `payment_webhook_events`, payment có thể đang `REVIEW_REQUIRED`.

### Ngrok hiện trang cảnh báo

Trình duyệt có thể thấy trang cảnh báo ngrok free. Khi test API bằng browser thì bấm `Visit Site`.

Với webhook thật, SePay vẫn cần gọi đúng URL webhook. Nếu webhook bị cảnh báo chặn, chạy lại ngrok và cấu hình lại URL mới trong SePay.

### Payment hết hạn

Booking giữ trong `BOOKING_HOLD_MINUTES`, mặc định `10` phút. Nếu quá hạn:

- `Booking` chuyển `EXPIRED`
- `Payment` chuyển `EXPIRED`
- Cần tạo booking mới và thanh toán lại

## Luồng Hoạt Động

1. Khách chọn ghế và tạo booking `PENDING`.
2. Khách chọn SePay ở màn thanh toán.
3. Frontend gọi `POST /api/bookings/:bookingId/sepay`.
4. Backend tạo hoặc trả lại payment SePay `PENDING` còn hạn.
5. Frontend hiển thị QR VietQR, số tiền và nội dung chuyển khoản dạng `CRT...`.
6. SePay gửi webhook về `POST /api/bookings/sepay-webhook`.
7. Backend xác thực header `Authorization: Apikey <SEPAY_API_KEY>`.
8. Webhook đúng tiền, đúng mã và booking còn hạn sẽ chuyển:
   - `Payment` sang `SUCCESS`
   - `Booking` sang `PAID`
   - `ShowtimeSeat` sang `BOOKED`
   - tạo `Ticket`
9. Frontend polling `GET /api/bookings/:bookingId/payment-status` mỗi 3 giây và tự chuyển sang vé điện tử khi thành công.

Không có nút tự xác nhận đã thanh toán trên frontend. SePay chỉ thành công khi webhook hợp lệ.

## Test Webhook Nội Bộ

Ví dụ test bằng PowerShell:

```powershell
$headers = @{ Authorization = "Apikey YOUR_SEPAY_API_KEY" }
$body = @{
  id = "TXN-TEST-001"
  transferType = "in"
  transferAmount = 120000
  content = "Thanh toan CRTBOOKINGCODE"
} | ConvertTo-Json

Invoke-RestMethod `
  -Uri "http://localhost:3000/api/bookings/sepay-webhook" `
  -Method Post `
  -Headers $headers `
  -ContentType "application/json" `
  -Body $body
```

Thay `transferAmount` và `CRTBOOKINGCODE` bằng đúng số tiền và nội dung đang hiển thị trên màn QR.

## Kiểm Tra Database

Các bảng liên quan:

- `payments`: trạng thái payment, provider `sepay`, `providerRef`, `providerTransactionId`, `expiredAt`.
- `payment_webhook_events`: log webhook đã nhận, payload đã lọc thông tin nhạy cảm, trạng thái xử lý.
- `bookings`, `showtime_seats`, `tickets`: được cập nhật trong transaction khi payment thành công.

Trạng thái cần chú ý:

- `PENDING`: đang chờ thanh toán.
- `SUCCESS`: webhook hợp lệ, đã phát hành vé.
- `EXPIRED`: booking/payment đã hết hạn.
- `REVIEW_REQUIRED`: webhook lệch tiền, sai mã, booking hết hạn hoặc cần đối soát thủ công.
