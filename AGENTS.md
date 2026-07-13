# AGENTS.md

Instructions for AI coding agents working on this repository.

## Project Identity

This project is **STI-cinema-ticket-DN**, an online cinema ticket booking system for cinemas in **Da Nang, Vietnam**.

The product goal is to aggregate movies, cinemas, showtimes, rooms, seats, prices, online booking, payment, and electronic tickets into one platform for:

- People living in Da Nang.
- Tourists visiting Da Nang.

When making product or technical decisions, assume the system is focused on the Da Nang cinema market and should support cinema chains such as CGV, Galaxy, Lotte, Metiz, Starlight, Rio, Le Do, and similar local cinemas.

## Current Tech Stack

- Backend: NestJS 11 + TypeScript.
- Frontend: HTML5, CSS3, vanilla JavaScript, hash router, custom MVC-style structure.
- Database: PostgreSQL 15.
- ORM: Prisma 5.
- Temporary seat holds: Redis 7 with TTL.
- Validation: class-validator, class-transformer, global NestJS ValidationPipe.
- API docs: Swagger.
- Password hashing: bcryptjs.
- Payment: mock payment, online demo payment, partial VNPay sandbox backend.
- Movie data import: TMDB API.
- Docker: PostgreSQL and Redis only.

Do not assume the frontend uses React, Next.js, Vue, Angular, or a component framework unless the user explicitly asks for a rewrite or a new version.

## Architecture Rules

- Keep the project a **modular monolith**.
- Use the flow: **Controller -> Service -> Prisma/Repository**.
- Keep PostgreSQL as the source of truth.
- Use Redis only for temporary seat holds with TTL.
- Use Prisma transactions for booking creation, payment confirmation, ticket creation, and any multi-table state change.
- Use Socket.IO rooms by showtime when adding real-time seat updates.
- Keep modules scoped by domain, such as auth, movies, cinemas, seats, seat-holds, bookings, payments, tickets, and admin.
- Prefer small, focused services over large cross-domain helpers.

Do not introduce microservices, Kafka, RabbitMQ, Kubernetes, message brokers, distributed infrastructure, or unnecessary new platforms.

## Business Flow

The core customer flow is:

```text
Browse movies -> view movie details -> choose cinema/showtime -> view seat map -> hold seats -> login/register -> create booking -> pay online/demo -> receive ticket QR -> view ticket history
```

Important behavior:

- Guests may browse movies, cinemas, showtimes, seats, and prices.
- Guests should be required to log in before creating a final booking or paying.
- Selecting a seat creates a Redis hold with a short TTL, currently around 5 minutes.
- While a seat is only held, `ShowtimeSeat.status` in PostgreSQL should remain `AVAILABLE`.
- After successful payment, the selected `ShowtimeSeat` records become `BOOKED`.
- A successful payment creates `Payment`, updates `Booking`, and creates `Ticket` records in a transaction.
- Ticket and booking QR check-in is a staff/admin operation, not a normal customer action.

## Seat State Rules

Use these concepts consistently:

- `AVAILABLE`: seat is free in PostgreSQL.
- `HELD`: derived from Redis hold data while DB status is still `AVAILABLE`.
- `BOOKED`: seat is permanently booked after payment.
- `BLOCKED`: seat is unavailable by admin/system action.

Redis hold rules:

- Key seat holds by showtime and showtime seat.
- Store session/user ownership information.
- Reject hold/release actions from another customer.
- Expired Redis holds should naturally free the seat.
- Do not persist temporary holds in PostgreSQL unless the user explicitly asks for a different design.

## Payment Rules

- Payment confirmation must be idempotent or safe to retry when integrating real providers.
- Payment callbacks must verify provider signatures before marking a booking paid.
- Booking, payment, seat booking, and ticket creation must be updated atomically.
- Demo payment providers are acceptable for local demo, but keep real payment boundaries clear.
- Keep currency as VND unless the user explicitly asks for another currency.

## Authentication And Authorization

Current code has register/login with password hashing, but it does not yet have full JWT/session auth or guards.

When adding protected features:

- Add proper JWT/session authentication before trusting user IDs from the frontend.
- Add role guards for admin/staff-only endpoints.
- Do not expose admin write operations without authorization.
- Do not rely on localStorage alone for backend security.

## Frontend Rules

The current frontend is vanilla JavaScript with MVC-style folders:

- `models/`
- `views/`
- `controllers/`
- `assets/js/utils/`
- `assets/css/`

When changing the existing frontend:

- Follow the existing plain JS style.
- Keep hash-based navigation unless asked otherwise.
- Prefer connecting views to real backend APIs over adding more mock-only logic.
- Keep UI text suitable for Vietnamese cinema users.
- Keep booking and payment flows clear and simple.
- Show a clear backend/database error when a required backend booking API is unavailable.

## Admin Scope

Admin features may include:

- Movie and genre management.
- TMDB movie import/sync.
- Cinema chain and cinema management.
- Room management.
- Seat layout generation.
- Showtime management with overlap checks and cleanup buffer.
- Booking/payment/ticket monitoring.
- Dashboard statistics.
- QR lookup and check-in operations.
- User management when auth/roles are implemented.

When building admin features, use backend APIs and PostgreSQL data rather than localStorage-only state.

## Data And Prisma Rules

- Update `prisma/schema.prisma` first for data model changes.
- Add Prisma migrations for schema changes.
- Keep seed data useful for the Da Nang demo.
- Do not manually edit generated Prisma Client files.
- Use Decimal carefully for money and convert to number only at API response boundaries.
- Keep relations and indexes aligned with booking, showtime, and lookup patterns.

## Commands

Common root commands:

```bash
npm install
npx prisma validate
npx prisma format
npx prisma generate
npx prisma migrate dev
npx prisma db seed
```

Backend commands:

```bash
cd backend
npm install
npm run start:dev
npm run build
npm run test
```

Frontend local run:

```bash
cd frontend
npx vite --host 0.0.0.0
```

Docker services:

```bash
docker compose up -d
```

## Verification Checklist

Before finishing meaningful code changes, verify the relevant parts:

- Prisma schema validates after model changes.
- Backend builds after TypeScript changes.
- Booking/payment changes use transactions.
- Seat hold changes preserve Redis TTL behavior.
- Frontend pages still load with the current vanilla JS router.
- Admin-only behavior is not made publicly writable without guards.
- Demo flow still works: movie -> showtime -> seats -> hold -> booking -> payment -> ticket.

## Things To Avoid

- Do not convert this project to microservices.
- Do not add Kafka, RabbitMQ, Kubernetes, or extra infrastructure.
- Do not replace the frontend framework unless explicitly requested.
- Do not treat Redis as the source of truth.
- Do not mark seats `BOOKED` before payment success.
- Do not trust frontend-provided `userId` for protected operations once auth is implemented.
- Do not silently fall back to mock booking/payment data when the backend flow is required.
