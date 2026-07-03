# Cinema Ticket System

This repository contains the initial Prisma-based database schema for the cinema ticket booking system.

## Development setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy the environment file and adjust the PostgreSQL connection string if needed:
   ```bash
   cp .env.example .env
   ```
3. Run Prisma commands:
   ```bash
   npx prisma migrate dev --name init
   npx prisma db seed
   ```

## Run backend

From the `backend/` folder, start the NestJS server:

```bash
cd backend
npm run start:dev
```

Then open the health API:

```bash
curl http://localhost:6767/api/health

# API docs (Swagger)
You can view the Swagger UI at: http://localhost:6767/api/docs

# Frontend (future)
Frontend will run on: http://localhost:3000
```

## Seed accounts (development only)

The seed script creates the following local development accounts:

- Admin: `admin@cinema.test` / `DevAdmin123!`
- Staff: `staff@cinema.test` / `DevStaff123!`
- Customer: `customer@cinema.test` / `DevCustomer123!`

These credentials are intended only for local development and should never be used in production.
