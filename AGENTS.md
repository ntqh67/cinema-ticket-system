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

## Clean Code And Reuse Rules

These rules are mandatory for every new feature, bug fix, and refactor.

### Inspect Before Writing

Before creating a class, method, helper, constant, mapper, formatter, API client, or validation rule:

- Search the repository for the same name, responsibility, input/output shape, and similar implementation.
- Inspect the relevant backend services, frontend models/views/controllers, shared utilities, Prisma seed, and scripts.
- Check for semantic duplication, not only identical text. Functions with different names may still perform the same job.
- Prefer extending or reusing an existing implementation when its responsibility and business rules match.
- Do not create a second implementation merely because importing the existing implementation requires a small refactor.
- Use `rg` and `rg --files` to search classes, methods, helpers, and business terms before editing.

### Single Source Of Truth

- Keep each reusable rule, mapping, formatter, calculation, and provider client in one canonical location.
- Put pure backend utilities that are shared across domains in `backend/src/common/`.
- Keep domain-specific business rules inside the owning service instead of moving them into a generic helper.
- Put reusable frontend formatting and mapping functions in `frontend/assets/js/utils/`.
- Put reusable frontend UI shells or behavior in `frontend/assets/js/components/`.
- Put shared script clients and script-only utilities in `scripts/`.
- Store shared static mappings in one data file when TypeScript and JavaScript runtimes both need them.
- Update all consumers to call the shared implementation, then remove the obsolete copies.
- Do not keep a copied fallback implementation after extracting a shared function.

### When Code Must Not Be Merged

Similar-looking code should remain separate when it enforces different:

- Domain ownership or authorization boundaries.
- Prisma transaction boundaries.
- Validation rules or error semantics.
- API response contracts.
- Seat-hold, booking, payment, or ticket state transitions.
- Runtime/deployment constraints that would make sharing fragile.

When retaining an apparent duplicate, verify that the difference is intentional and explain the reason in the handoff. Do not merge code only to reduce line count.

### Class And Method Design

- Give every class or object one clear responsibility.
- Keep controllers thin: parse HTTP input and delegate to services.
- Keep database access and business state changes in services/repositories, not controllers or frontend views.
- Keep frontend controllers focused on event coordination, models focused on data/API access, and views focused on rendering and DOM updates.
- Prefer small methods with descriptive names and explicit inputs/outputs.
- Extract repeated conditions or calculations only when the extracted name makes the business rule clearer.
- Replace magic numbers and repeated strings with named constants when they represent business configuration.
- Remove dead code, unused variables, obsolete methods, duplicate wrappers, and stale comments during the same change.
- Avoid generic catch-all helpers that couple unrelated domains.

### Comment Rules

- Write code comments in Vietnamese unless an external protocol or official identifier requires English.
- Add a concise comment for each class/object, public method, and non-obvious business block.
- Explain purpose, business reason, ownership, transaction boundary, or state transition; do not merely translate the code into prose.
- Keep comments next to the code they describe and update them whenever behavior changes.
- Never leave duplicated, contradictory, stale, or misleading comments.
- Do not add several identical comments above consecutive conditions; describe the surrounding logical block once.
- Keep external names such as Prisma, Redis, TMDB, VNPay, SePay, DTO, API, and HTTP unchanged.

### Required Duplication Review

Before finishing a meaningful code change:

- Search again for the new class, method, helper, constants, and key business terms.
- Confirm that only one canonical implementation exists for reusable behavior.
- Check that old private helpers were removed after consumers switched to the shared version.
- Check that shared JavaScript used by the NestJS build is copied to `dist` and has TypeScript declarations when required.
- Confirm that shared changes did not move transaction-sensitive logic outside its transaction.
- Run `git diff --check` and review the diff for accidental copied blocks and repeated comments.

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

- Review the repository for exact and semantic duplication introduced by the change.
- Reuse existing classes, methods, utilities, mappings, and components where responsibilities match.
- Remove superseded copies after extracting shared code.
- Ensure comments are Vietnamese, current, useful, and not duplicated.
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
