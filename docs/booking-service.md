# Booking Service API

This document covers the Booking Service endpoints owned by Quang Huy.

## Workflow

```text
POST /api/auth/register
POST /api/auth/login
GET  /api/movies
GET  /api/movies/:movieId/showtimes
GET  /api/showtimes/:showtimeId/seats
POST /api/bookings
POST /api/bookings/:bookingId/vnpay
POST /api/bookings/:bookingId/online-demo-pay
GET  /api/bookings/vnpay-return
GET  /api/users/:userId/tickets
GET  /api/bookings
GET  /api/bookings/:bookingId/tickets
DELETE /api/bookings/:bookingId
GET  /api/bookings/qr/:bookingQrToken
POST /api/bookings/qr/:bookingQrToken/check-in
GET  /api/tickets/qr/:qrToken
POST /api/tickets/qr/:qrToken/check-in
```

The expected flow is:

```text
Register/login database user -> load backend catalog -> load showtime seats -> create booking -> pay online -> view ticket QR
```

The Booking Service frontend must use PostgreSQL-backed APIs for auth, catalog, seats, booking, payment, tickets, and history. It should show a clear backend/database error instead of silently falling back to local mock data.
Ticket check-in is a staff/cinema operation through the QR API, not a customer-facing button.
The customer website only offers online payment methods; cash/payment at counter is not shown in the web flow.

## Get Showtime Seats

```text
GET /api/showtimes/:showtimeId/seats
```

Returns showtime information and the seats for that showtime.

Seat statuses:

```text
AVAILABLE, HELD, BOOKED, BLOCKED
```

Example response:

```json
{
  "showtime": {
    "id": "showtime_id",
    "startAt": "2026-06-29T19:00:00.000Z",
    "endAt": "2026-06-29T21:12:00.000Z",
    "basePrice": 15,
    "movie": {
      "id": "movie_id",
      "title": "Midnight Circuit"
    },
    "room": {
      "id": "room_id",
      "name": "Screen 1",
      "cinema": {
        "id": "cinema_id",
        "name": "Aurora Cineplex"
      }
    }
  },
  "seats": [
    {
      "showtimeSeatId": "showtime_seat_id",
      "seatId": "seat_id",
      "row": "A",
      "number": 1,
      "type": "STANDARD",
      "price": 15,
      "status": "AVAILABLE"
    }
  ]
}
```

## Create Booking

```text
POST /api/bookings
```

Example request:

```json
{
  "userId": "user_id",
  "showtimeId": "showtime_id",
  "showtimeSeatIds": ["showtime_seat_id"]
}
```

Behavior:

- Validates that the user and showtime exist.
- Validates that all selected seats belong to the showtime.
- Requires every selected seat to be `AVAILABLE`.
- Creates a `PENDING` booking and booking items.
- Changes selected seats to `HELD`.
- Sets `expiresAt` to 10 minutes after booking creation.

Example response:

```json
{
  "id": "booking_id",
  "status": "PENDING",
  "totalAmount": 15,
  "currency": "USD",
  "expiresAt": "2026-07-03T04:41:40.465Z",
  "items": [
    {
      "id": "booking_item_id",
      "showtimeSeatId": "showtime_seat_id",
      "row": "A",
      "number": 1,
      "type": "STANDARD",
      "unitPrice": 15
    }
  ]
}
```

## Legacy Internal Pay Booking

```text
POST /api/bookings/:bookingId/pay
```

This endpoint is kept only for internal/backend checks. The customer website does not call it. The customer payment flow uses VNPay Sandbox through `POST /api/bookings/:bookingId/vnpay`.

No request body is required. The payment provider value is `mock`.

Behavior:

- Requires the booking to be `PENDING`.
- Rejects expired bookings.
- Requires all booking seats to still be `HELD`.
- Creates a `SUCCESS` payment.
- Changes the booking to `PAID`.
- Changes selected seats to `BOOKED`.
- Creates one `VALID` ticket per booking item.

Example response:

```json
{
  "bookingId": "booking_id",
  "status": "PAID",
  "payment": {
    "id": "payment_id",
    "status": "SUCCESS",
    "amount": 15,
    "currency": "USD",
    "provider": "mock",
    "providerRef": "uuid",
    "paidAt": "2026-07-03T04:31:44.928Z"
  },
  "tickets": [
    {
      "id": "ticket_id",
      "qrToken": "uuid",
      "status": "VALID",
      "seat": {
        "row": "A",
        "number": 1,
        "type": "STANDARD"
      }
    }
  ]
}
```

## Create VNPay Sandbox Payment

```text
POST /api/bookings/:bookingId/vnpay
```

Creates a `PENDING` VNPay payment and returns `paymentUrl`. The frontend redirects the browser to this URL.

Required environment variables:

```text
VNPAY_TMN_CODE
VNPAY_HASH_SECRET
VNPAY_PAYMENT_URL
VNPAY_RETURN_URL
FRONTEND_URL
VNPAY_DEMO_MODE
```

If `VNPAY_DEMO_MODE="true"`, the service uses an internal VNPay demo redirect instead of real VNPay Sandbox credentials. This is useful when `VNPAY_TMN_CODE` and `VNPAY_HASH_SECRET` are not available yet. The demo flow still writes real `Payment`, `Booking`, `ShowtimeSeat`, and `Ticket` data to PostgreSQL.

## Online Demo Payment

```text
POST /api/bookings/:bookingId/online-demo-pay
```

Example request:

```json
{
  "provider": "momo"
}
```

Accepted providers are `vnpay`, `card`, `momo`, and `zalopay`. This endpoint is used by the customer frontend demo. It confirms the pending booking immediately, writes a real payment provider such as `momo-demo`, books the held seats, and creates tickets in PostgreSQL.

## VNPay Return

```text
GET /api/bookings/vnpay-return
```

Verifies `vnp_SecureHash`. On VNPay success, it changes booking to `PAID`, seats to `BOOKED`, payment to `SUCCESS`, creates tickets, then redirects to `#/ticket/:bookingId`.

## VNPay Demo Return

```text
GET /api/bookings/vnpay-demo-return?ref=:providerRef
```

Only works when `VNPAY_DEMO_MODE="true"`. It simulates a successful VNPay payment for local/demo use, confirms the pending booking, and redirects to `#/ticket/:bookingId?payment=success&mode=demo`.

## View User Tickets

```text
GET /api/users/:userId/tickets
```

Returns paid tickets owned by a user.

Example response:

```json
{
  "userId": "user_id",
  "tickets": [
    {
      "id": "ticket_id",
      "qrToken": "uuid",
      "status": "VALID",
      "issuedAt": "2026-07-03T04:31:44.942Z",
      "expiresAt": null,
      "movie": {
        "id": "movie_id",
        "title": "Midnight Circuit"
      },
      "showtime": {
        "id": "showtime_id",
        "startAt": "2026-06-29T19:00:00.000Z",
        "endAt": "2026-06-29T21:12:00.000Z"
      },
      "cinema": {
        "id": "cinema_id",
        "name": "Aurora Cineplex"
      },
      "room": {
        "id": "room_id",
        "name": "Screen 1"
      },
      "seat": {
        "row": "A",
        "number": 1,
        "type": "STANDARD"
      },
      "booking": {
        "id": "booking_id",
        "status": "PAID",
        "totalAmount": 15,
        "currency": "USD"
      }
    }
  ]
}
```

## Expire Pending Bookings

```text
POST /api/bookings/expire
```

Expires pending bookings whose `expiresAt` is in the past.

Behavior:

- Changes expired `PENDING` bookings to `EXPIRED`.
- Changes their `HELD` seats back to `AVAILABLE`.
- Returns the affected booking and seat counts.

Example response:

```json
{
  "expiredBookingCount": 2,
  "releasedSeatCount": 3
}
```

## Admin Booking List

```text
GET /api/bookings
```

Returns the latest bookings from PostgreSQL for the admin booking screen.

## View Tickets By Booking

```text
GET /api/bookings/:bookingId/tickets
```

Returns all tickets in one booking plus `bookingQrToken`. The customer UI renders one large QR for the whole booking, even when the booking has multiple seats.

## Staff Booking QR Lookup And Check-in

```text
GET  /api/bookings/qr/:bookingQrToken
POST /api/bookings/qr/:bookingQrToken/check-in
```

Uses a booking QR token in the format `CINETICKET:BOOKING:{bookingId}`. Check-in changes all `VALID` tickets in that booking to `USED`.

## Cancel Pending Booking

```text
DELETE /api/bookings/:bookingId
```

Only `PENDING` bookings can be cancelled. Cancelling releases their `HELD` seats back to `AVAILABLE`.

## Staff Ticket QR Lookup And Check-in

```text
GET  /api/tickets/qr/:qrToken
POST /api/tickets/qr/:qrToken/check-in
```

The QR lookup returns one ticket with movie, user, showtime, cinema, room, seat, booking, and check-in information. This per-ticket QR API is legacy/staff-facing; the customer UI renders the booking QR from `CINETICKET:BOOKING:{bookingId}`.

Check-in behavior:

- Requires the ticket to be `VALID`.
- Changes ticket status to `USED`.
- Creates a `TicketCheckIn` row with optional `checkedInBy` and `notes`.

## Common Errors

```text
400 Booking has expired
400 Duplicate seats are not allowed
400 Only pending bookings can be paid
400 One or more seats do not belong to this showtime
404 Booking not found
404 Showtime not found
404 Ticket not found
404 User not found
409 One or more seats are not available
409 One or more seats are no longer held
```
