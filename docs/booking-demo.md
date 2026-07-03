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

## Step 3 - Pay Booking

```powershell
$paidBooking = Invoke-RestMethod `
  -Method Post `
  -Uri "http://localhost:3000/api/bookings/$($booking.id)/pay"

$paidBooking | ConvertTo-Json -Depth 8
```

Expected:

```text
Booking status changes to PAID.
Payment status is SUCCESS.
Selected ShowtimeSeat status changes to BOOKED.
One VALID ticket is created for each booking item.
Response includes qrToken.
```

## Step 4 - View User Tickets

```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/users/$userId/tickets" | ConvertTo-Json -Depth 10
```

Expected:

```text
The paid ticket appears in the tickets array.
The ticket includes movie, showtime, cinema, room, seat, booking, and qrToken.
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

## Postman URLs

```text
GET  http://localhost:3000/api/showtimes/:showtimeId/seats
POST http://localhost:3000/api/bookings
POST http://localhost:3000/api/bookings/:bookingId/pay
GET  http://localhost:3000/api/users/:userId/tickets
POST http://localhost:3000/api/bookings/expire
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
[ ] Pay booking returns PAID booking.
[ ] Payment is SUCCESS.
[ ] Selected seat changes to BOOKED.
[ ] Ticket is VALID and has qrToken.
[ ] User tickets endpoint returns the paid ticket.
[ ] Expire endpoint can release old pending bookings.
```
