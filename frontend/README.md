# Cinema Frontend

This folder contains the static frontend copied from the `UI` branch and moved into the project frontend folder.

## Run

Serve the frontend as a static site:

```powershell
cd "D:\My Project\Project 4 - Cinema"
npx.cmd http-server frontend -p 5173
```

Then open:

```text
http://localhost:5173
```

The Booking Service flow uses PostgreSQL-backed backend APIs for login/register, movie catalog, showtimes, seats, booking, online payment, ticket history, and booking QR display. Promotions have been removed from the customer and admin UI.

## Booking API Targets

```text
GET  /api/showtimes/:showtimeId/seats
POST /api/bookings
POST /api/bookings/:bookingId/vnpay
GET  /api/bookings/vnpay-return
GET  /api/users/:userId/tickets
GET  /api/bookings/:bookingId/tickets
GET  /api/bookings/qr/:bookingQrToken
POST /api/bookings/qr/:bookingQrToken/check-in
POST /api/bookings/expire
```
