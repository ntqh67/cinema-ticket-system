# Huong Dan Thanh Toan SePay

Tai lieu nay mo ta flow SePay hien tai cua CRTicket. Web khach hang chi ho tro
SePay, khong con VNPay, MoMo, ZaloPay hoac the ngan hang trong man thanh toan.

## Bien Moi Truong

Can cau hinh trong `.env`:

```env
SEPAY_ENABLED="true"
SEPAY_BANK_ACCOUNT="SO_TAI_KHOAN_NHAN_TIEN"
SEPAY_BANK_CODE="MA_NGAN_HANG"
SEPAY_ACCOUNT_NAME="TEN_CHU_TAI_KHOAN"
SEPAY_API_KEY="API_KEY_CUA_SEPAY"
SEPAY_PAYMENT_PREFIX="CRT"
SEPAY_WEBHOOK_URL="https://xxxxx.ngrok-free.dev/api/bookings/sepay-webhook"
BOOKING_HOLD_MINUTES="10"
```

Khong commit `.env` that len GitHub. Moi thanh vien dung `.env.example` de tao
file `.env` rieng.

## API Dang Dung

```text
GET  /api/bookings/payment-methods
POST /api/bookings/:bookingId/sepay
GET  /api/bookings/:bookingId/payment-status
POST /api/bookings/sepay-webhook
```

`GET /api/bookings/payment-methods` chi tra ve SePay:

```json
{
  "methods": [
    { "id": "sepay", "enabled": true, "mode": "live" }
  ]
}
```

## Luong Khach Hang

1. Khach chon phim.
2. Khach chon suat chieu.
3. Khach chon ghe.
4. Khach chon hoac bo qua combo bap nuoc.
5. Khach vao trang thanh toan.
6. Frontend tu goi `POST /api/bookings/:bookingId/sepay`.
7. Trang thanh toan tu hien QR, so tien va noi dung chuyen khoan.
8. Khach quet QR va chuyen khoan dung so tien, dung noi dung.
9. SePay gui webhook ve backend qua URL public/ngrok.
10. Backend xac thuc `Authorization: Apikey <SEPAY_API_KEY>`.
11. Neu webhook hop le, backend cap nhat payment, booking, ghe va ticket trong transaction.
12. Frontend polling `GET /api/bookings/:bookingId/payment-status` moi 3 giay va tu chuyen sang ve dien tu khi thanh cong.

Khong co nut tu xac nhan da thanh toan tren frontend. SePay chi thanh cong khi
backend nhan webhook hop le.

## Cau Hinh Webhook SePay

Trong SePay Dashboard:

- URL nhan webhook: `https://xxxxx.ngrok-free.dev/api/bookings/sepay-webhook`
- Loai giao dich: Tien vao
- Dinh dang du lieu: JSON
- Bao mat: API Key
- Header hop le: `Authorization: Apikey <SEPAY_API_KEY>`

Moi lan ngrok doi URL, phai cap nhat lai URL webhook trong SePay Dashboard.

## Test Ngrok

Chay backend port 3000, sau do chay:

```powershell
ngrok http 3000
```

Kiem tra endpoint:

```text
https://xxxxx.ngrok-free.dev/api/bookings/payment-methods
```

Neu vao `/` thay `Cannot GET /` thi khong sao, vi backend khong co route goc.
Can test dung route `/api/bookings/payment-methods`.

Theo doi webhook tai:

```text
http://127.0.0.1:4040
```

Khi SePay goi dung se thay:

```text
POST /api/bookings/sepay-webhook
```

## Test Webhook Gia

Dung khi can test backend ma khong chuyen khoan that. Lay so tien va noi dung
`CRT...` dang hien tren QR roi chay:

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

Ket qua dung:

- `payments.status = SUCCESS`
- `bookings.status = PAID`
- `showtime_seats.status = BOOKED`
- Bang `tickets` co ve moi
- Bang `payment_webhook_events` co log webhook `PROCESSED`

## Loi Thuong Gap

Web dung o `Dang cho SePay xac nhan`:

- Mo `http://127.0.0.1:4040`.
- Neu khong co `POST /api/bookings/sepay-webhook`: SePay chua goi webhook hoac URL sai.
- Neu co 401: sai API key/header.
- Neu co 200 nhung khong ra ve: xem `payment_webhook_events`, thuong la sai so tien, sai noi dung hoac booking da het han.

Booking het han:

- Mac dinh giu booking 10 phut.
- Het han thi booking/payment thanh `EXPIRED`, can tao booking moi.
