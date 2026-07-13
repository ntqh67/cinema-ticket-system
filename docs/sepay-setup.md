# Cấu hình thanh toán SePay

Backend đã cung cấp:

- `POST /api/bookings/:bookingId/sepay`: tạo mã thanh toán và URL VietQR.
- `POST /api/bookings/sepay-webhook`: nhận giao dịch tiền vào từ SePay.

## Biến môi trường

```env
SEPAY_BANK_ACCOUNT="SO_TAI_KHOAN_NHAN"
SEPAY_BANK_CODE="MA_NGAN_HANG_VIETQR"
SEPAY_ACCOUNT_NAME="TEN_CHU_TAI_KHOAN"
SEPAY_API_KEY="API_KEY_CUA_WEBHOOK"
```

## Cấu hình trên SePay

1. Liên kết tài khoản ngân hàng nhận tiền.
2. Cấu hình mã thanh toán có tiền tố `CRT`.
3. Tạo webhook loại **Tiền vào**, định dạng JSON.
4. Chọn xác thực **API Key** và đặt cùng giá trị `SEPAY_API_KEY`.
5. Đặt URL webhook production:

   ```text
   https://ten-mien-cua-ban/api/bookings/sepay-webhook
   ```

6. Bật bỏ qua giao dịch không có mã thanh toán và lọc tiền tố `CRT`.

SePay không gọi được `localhost` ở môi trường thật. Khi phát triển, dùng SePay Test mode hoặc một HTTPS tunnel.

Webhook chỉ xác nhận booking khi giao dịch là tiền vào, mã thanh toán khớp, số tiền khớp hoàn toàn và mã giao dịch chưa từng xử lý. Việc cập nhật Payment, Booking, ghế và Ticket chạy trong transaction.
