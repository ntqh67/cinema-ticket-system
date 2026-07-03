# Booking Service API

This document covers the Booking Service endpoints owned by Quang Huy.

## Workflow

```text
GET  /api/showtimes/:showtimeId/seats
POST /api/bookings
POST /api/bookings/:bookingId/pay
GET  /api/users/:userId/tickets
```

The expected flow is:

```text
Load showtime seats -> create booking -> pay booking -> view user tickets
```

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

## Pay Booking

```text
POST /api/bookings/:bookingId/pay
```

No request body is required. The payment provider is currently mocked.

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

## Common Errors

```text
400 Booking has expired
400 Duplicate seats are not allowed
400 Only pending bookings can be paid
400 One or more seats do not belong to this showtime
404 Booking not found
404 Showtime not found
404 User not found
409 One or more seats are not available
409 One or more seats are no longer held
```
