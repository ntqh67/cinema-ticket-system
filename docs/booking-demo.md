# Booking Service Demo Workflow

Use this checklist to demo Quang Huy's Booking Service from start to finish.

## Prerequisites

Start the database and backend:

```powershell
cd "D:\My Project\Project 4 - Cinema"
docker compose up -d

cd "D:\My Project\Project 4 - Cinema\backend"
npm.cmd run start:dev
```

Optional health check:

```powershell
Invoke-RestMethod -Uri http://localhost:3000/api/health
```

## Demo IDs

Use Prisma Studio to copy real IDs:

```powershell
cd "D:\My Project\Project 4 - Cinema"
npx.cmd prisma studio
```

Recommended seed user:

```text
customer@cinema.test
```

Current local seed IDs may differ after reseeding, so copy these from Prisma Studio:

```text
User.id
Showtime.id
ShowtimeSeat.id with status AVAILABLE
```

## Step 1 - Load Seats

Before selecting seats in the UI, register or login with a database-backed account:

```text
admin@cinema.test / admin123
hung@example.com / user123
```

Newly registered accounts must appear in Prisma Studio table `User`.

```powershell
$showtimeId = "PASTE_SHOWTIME_ID"
Invoke-RestMethod -Uri "http://localhost:3000/api/showtimes/$showtimeId/seats" | ConvertTo-Json -Depth 8
```

Expected:

```text
The selected showtime is returned with a seats array.
At least one seat should have status AVAILABLE.
```

## Step 2 - Create Booking

```powershell
$userId = "PASTE_USER_ID"
$showtimeSeatId = "PASTE_AVAILABLE_SHOWTIME_SEAT_ID"

$body = @{
  userId = $userId
  showtimeId = $showtimeId
  showtimeSeatIds = @($showtimeSeatId)
} | ConvertTo-Json

$booking = Invoke-RestMethod `
  -Method Post `
  -Uri http://localhost:3000/api/bookings `
  -ContentType "application/json" `
  -Body $body

$booking | ConvertTo-Json -Depth 8
```

Expected:

```text
Booking status is PENDING.
Selected ShowtimeSeat status changes from AVAILABLE to HELD.
Response includes expiresAt and totalAmount.
```

## Step 3 - Create VNPay Payment

If you do not have real VNPay Sandbox credentials yet, keep this in `.env`:

```env
VNPAY_DEMO_MODE="true"
```

```powershell
$vnpay = Invoke-RestMethod `
  -Method Post `
  -Uri "http://localhost:3000/api/bookings/$($booking.id)/vnpay"

$vnpay | ConvertTo-Json -Depth 8
```

Expected:

```text
A VNPay paymentUrl is returned.
If VNPAY_DEMO_MODE=true, open paymentUrl and the backend simulates a successful VNPay return.
If real VNPay Sandbox credentials are configured, open paymentUrl and complete the sandbox payment.
On success, the frontend opens #/ticket/{bookingId}?payment=success.
```

## Step 4 - View User Tickets

```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/users/$userId/tickets" | ConvertTo-Json -Depth 10
```

Expected:

```text
The paid ticket appears in the tickets array.
The ticket includes movie, showtime, cinema, room, seat, booking, and booking QR data.
The customer UI shows one large QR for the whole booking.
```

## Step 5 - Expire Old Pending Bookings

```powershell
Invoke-RestMethod -Method Post -Uri http://localhost:3000/api/bookings/expire | ConvertTo-Json -Depth 5
```

Expected:

```text
Expired PENDING bookings are changed to EXPIRED.
Their HELD seats are released back to AVAILABLE.
Calling the endpoint again should return zero counts if no expired bookings remain.
```

## Step 6 - Admin Booking List

```powershell
Invoke-RestMethod -Uri http://localhost:3000/api/bookings | ConvertTo-Json -Depth 10
```

Expected:

```text
Admin booking data is loaded from PostgreSQL, not localStorage/mock data.
```

## Step 7 - Booking QR Lookup And Check-in

Use the `bookingQrToken` from `GET /api/bookings/:bookingId/tickets`. This is a staff/cinema operation; the customer UI only displays the QR.

```powershell
$bookingQrToken = "CINETICKET:BOOKING:PASTE_BOOKING_ID"
$encodedQr = [System.Uri]::EscapeDataString($bookingQrToken)
Invoke-RestMethod -Uri "http://localhost:3000/api/bookings/qr/$encodedQr" | ConvertTo-Json -Depth 10

$body = @{ checkedInBy = "staff@cinema.test"; notes = "Demo check-in" } | ConvertTo-Json
Invoke-RestMethod `
  -Method Post `
  -Uri "http://localhost:3000/api/bookings/qr/$encodedQr/check-in" `
  -ContentType "application/json" `
  -Body $body | ConvertTo-Json -Depth 10
```

Expected:

```text
All VALID tickets in the booking change to USED.
TicketCheckIn rows are created.
```

## Postman URLs

```text
GET  http://localhost:3000/api/showtimes/:showtimeId/seats
POST http://localhost:3000/api/bookings
POST http://localhost:3000/api/bookings/:bookingId/vnpay
POST http://localhost:3000/api/bookings/:bookingId/online-demo-pay
GET  http://localhost:3000/api/bookings/vnpay-return
GET  http://localhost:3000/api/users/:userId/tickets
POST http://localhost:3000/api/bookings/expire
GET  http://localhost:3000/api/bookings
GET  http://localhost:3000/api/bookings/:bookingId/tickets
DELETE http://localhost:3000/api/bookings/:bookingId
GET  http://localhost:3000/api/bookings/qr/:bookingQrToken
POST http://localhost:3000/api/bookings/qr/:bookingQrToken/check-in
GET  http://localhost:3000/api/tickets/qr/:qrToken
POST http://localhost:3000/api/tickets/qr/:qrToken/check-in
```

## Booking Request Body

```json
{
  "userId": "PASTE_USER_ID",
  "showtimeId": "PASTE_SHOWTIME_ID",
  "showtimeSeatIds": ["PASTE_AVAILABLE_SHOWTIME_SEAT_ID"]
}
```

## Demo Pass Checklist

```text
[ ] Seats endpoint returns AVAILABLE seats.
[ ] Create booking returns PENDING booking.
[ ] Selected seat changes to HELD.
[ ] VNPay paymentUrl is returned.
[ ] VNPay success return marks booking PAID.
[ ] Frontend payment page only shows online methods, not cash.
[ ] Selected seat changes to BOOKED.
[ ] Booking has one large scannable QR image.
[ ] User tickets endpoint returns the paid ticket.
[ ] Expire endpoint can release old pending bookings.
[ ] Admin booking list comes from PostgreSQL.
[ ] Frontend shows a backend/database error if API is offline instead of using mock booking data.
[ ] Booking QR check-in changes all tickets from VALID to USED.
```
