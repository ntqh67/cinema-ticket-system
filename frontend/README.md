# Cinema Frontend

This folder contains the static frontend copied from the `UI` branch and moved into the project frontend folder.

## Run

Open this file in a browser:

```text
frontend/index.html
```

The UI currently uses mock data and localStorage. Booking backend integration can be added next by replacing the mock booking, seat, payment, and ticket model methods with calls to the NestJS API.

## Booking API Targets

```text
GET  /api/showtimes/:showtimeId/seats
POST /api/bookings
POST /api/bookings/:bookingId/pay
GET  /api/users/:userId/tickets
POST /api/bookings/expire
```
