-- Mục đích: Migration PostgreSQL; mỗi khối lần lượt thay đổi cấu trúc, chỉ mục hoặc khóa ngoại.
-- Tạo các enum dùng chung cho vai trò, trạng thái phim, ghế, booking, thanh toán và vé.
CREATE TYPE "Role" AS ENUM ('CUSTOMER', 'ADMIN', 'STAFF');

CREATE TYPE "MovieStatus" AS ENUM ('DRAFT', 'NOW_SHOWING', 'COMING_SOON', 'ENDED');

CREATE TYPE "SeatType" AS ENUM ('STANDARD', 'VIP', 'COUPLE');

CREATE TYPE "ShowtimeSeatStatus" AS ENUM ('AVAILABLE', 'HELD', 'BOOKED', 'BLOCKED');

CREATE TYPE "BookingStatus" AS ENUM ('PENDING', 'PAID', 'CANCELLED', 'EXPIRED', 'REFUNDED');

CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'CANCELLED', 'REFUNDED');

CREATE TYPE "TicketStatus" AS ENUM ('VALID', 'USED', 'CANCELLED', 'EXPIRED');

-- Tạo bảng và các cột dữ liệu cho miền nghiệp vụ kế tiếp.
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "role" "Role" NOT NULL DEFAULT 'CUSTOMER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- Tạo bảng và các cột dữ liệu cho miền nghiệp vụ kế tiếp.
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- Tạo bảng và các cột dữ liệu cho miền nghiệp vụ kế tiếp.
CREATE TABLE "movies" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "posterUrl" TEXT,
    "trailerUrl" TEXT,
    "durationMin" INTEGER NOT NULL,
    "releaseDate" TIMESTAMP(3),
    "status" "MovieStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "movies_pkey" PRIMARY KEY ("id")
);

-- Tạo bảng và các cột dữ liệu cho miền nghiệp vụ kế tiếp.
CREATE TABLE "genres" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "genres_pkey" PRIMARY KEY ("id")
);

-- Tạo bảng và các cột dữ liệu cho miền nghiệp vụ kế tiếp.
CREATE TABLE "movie_genres" (
    "movieId" TEXT NOT NULL,
    "genreId" TEXT NOT NULL,

    CONSTRAINT "movie_genres_pkey" PRIMARY KEY ("movieId", "genreId")
);

-- Tạo bảng và các cột dữ liệu cho miền nghiệp vụ kế tiếp.
CREATE TABLE "cinemas" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "city" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cinemas_pkey" PRIMARY KEY ("id")
);

-- Tạo bảng và các cột dữ liệu cho miền nghiệp vụ kế tiếp.
CREATE TABLE "rooms" (
    "id" TEXT NOT NULL,
    "cinemaId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rooms_pkey" PRIMARY KEY ("id")
);

-- Tạo bảng và các cột dữ liệu cho miền nghiệp vụ kế tiếp.
CREATE TABLE "seats" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "row" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "type" "SeatType" NOT NULL DEFAULT 'STANDARD',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "seats_pkey" PRIMARY KEY ("id")
);

-- Tạo bảng và các cột dữ liệu cho miền nghiệp vụ kế tiếp.
CREATE TABLE "showtimes" (
    "id" TEXT NOT NULL,
    "movieId" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "basePrice" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "showtimes_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "showtimes_startAt_endAt_check" CHECK ("startAt" < "endAt")
);

-- Tạo bảng và các cột dữ liệu cho miền nghiệp vụ kế tiếp.
CREATE TABLE "showtime_seats" (
    "id" TEXT NOT NULL,
    "showtimeId" TEXT NOT NULL,
    "seatId" TEXT NOT NULL,
    "status" "ShowtimeSeatStatus" NOT NULL DEFAULT 'AVAILABLE',
    "price" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "showtime_seats_pkey" PRIMARY KEY ("id")
);

-- Tạo bảng và các cột dữ liệu cho miền nghiệp vụ kế tiếp.
CREATE TABLE "bookings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "showtimeId" TEXT NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'PENDING',
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- Tạo bảng và các cột dữ liệu cho miền nghiệp vụ kế tiếp.
CREATE TABLE "booking_items" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "showtimeSeatId" TEXT NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "booking_items_pkey" PRIMARY KEY ("id")
);

-- Tạo bảng và các cột dữ liệu cho miền nghiệp vụ kế tiếp.
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "provider" TEXT,
    "providerRef" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- Tạo bảng và các cột dữ liệu cho miền nghiệp vụ kế tiếp.
CREATE TABLE "tickets" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "bookingItemId" TEXT NOT NULL,
    "qrToken" TEXT NOT NULL,
    "status" "TicketStatus" NOT NULL DEFAULT 'VALID',
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tickets_pkey" PRIMARY KEY ("id")
);

-- Tạo bảng và các cột dữ liệu cho miền nghiệp vụ kế tiếp.
CREATE TABLE "ticket_check_ins" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "checkedInAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "checkedInBy" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ticket_check_ins_pkey" PRIMARY KEY ("id")
);

-- Tạo chỉ mục để tăng tốc truy vấn theo các trường thường dùng.
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- Tạo chỉ mục để tăng tốc truy vấn theo các trường thường dùng.
CREATE INDEX "users_email_idx" ON "users"("email");

-- Tạo chỉ mục để tăng tốc truy vấn theo các trường thường dùng.
CREATE INDEX "users_role_idx" ON "users"("role");

-- Tạo chỉ mục để tăng tốc truy vấn theo các trường thường dùng.
CREATE UNIQUE INDEX "refresh_tokens_tokenHash_key" ON "refresh_tokens"("tokenHash");

-- Tạo chỉ mục để tăng tốc truy vấn theo các trường thường dùng.
CREATE INDEX "refresh_tokens_userId_idx" ON "refresh_tokens"("userId");

-- Tạo chỉ mục để tăng tốc truy vấn theo các trường thường dùng.
CREATE INDEX "refresh_tokens_expiresAt_idx" ON "refresh_tokens"("expiresAt");

-- Tạo chỉ mục để tăng tốc truy vấn theo các trường thường dùng.
CREATE INDEX "movies_status_idx" ON "movies"("status");

-- Tạo chỉ mục để tăng tốc truy vấn theo các trường thường dùng.
CREATE INDEX "movies_releaseDate_idx" ON "movies"("releaseDate");

-- Tạo chỉ mục để tăng tốc truy vấn theo các trường thường dùng.
CREATE INDEX "movies_title_idx" ON "movies"("title");

-- Tạo chỉ mục để tăng tốc truy vấn theo các trường thường dùng.
CREATE UNIQUE INDEX "genres_name_key" ON "genres"("name");

-- Tạo chỉ mục để tăng tốc truy vấn theo các trường thường dùng.
CREATE INDEX "movie_genres_genreId_idx" ON "movie_genres"("genreId");

-- Tạo chỉ mục để tăng tốc truy vấn theo các trường thường dùng.
CREATE INDEX "cinemas_city_idx" ON "cinemas"("city");

-- Tạo chỉ mục để tăng tốc truy vấn theo các trường thường dùng.
CREATE INDEX "cinemas_name_idx" ON "cinemas"("name");

-- Tạo chỉ mục để tăng tốc truy vấn theo các trường thường dùng.
CREATE UNIQUE INDEX "rooms_cinemaId_name_key" ON "rooms"("cinemaId", "name");

-- Tạo chỉ mục để tăng tốc truy vấn theo các trường thường dùng.
CREATE INDEX "rooms_cinemaId_idx" ON "rooms"("cinemaId");

-- Tạo chỉ mục để tăng tốc truy vấn theo các trường thường dùng.
CREATE UNIQUE INDEX "seats_roomId_row_number_key" ON "seats"("roomId", "row", "number");

-- Tạo chỉ mục để tăng tốc truy vấn theo các trường thường dùng.
CREATE INDEX "seats_roomId_idx" ON "seats"("roomId");

-- Tạo chỉ mục để tăng tốc truy vấn theo các trường thường dùng.
CREATE INDEX "seats_type_idx" ON "seats"("type");

-- Tạo chỉ mục để tăng tốc truy vấn theo các trường thường dùng.
CREATE INDEX "showtimes_movieId_startAt_idx" ON "showtimes"("movieId", "startAt");

-- Tạo chỉ mục để tăng tốc truy vấn theo các trường thường dùng.
CREATE INDEX "showtimes_roomId_startAt_idx" ON "showtimes"("roomId", "startAt");

-- Tạo chỉ mục để tăng tốc truy vấn theo các trường thường dùng.
CREATE INDEX "showtimes_startAt_idx" ON "showtimes"("startAt");

-- Tạo chỉ mục để tăng tốc truy vấn theo các trường thường dùng.
CREATE UNIQUE INDEX "showtime_seats_showtimeId_seatId_key" ON "showtime_seats"("showtimeId", "seatId");

-- Tạo chỉ mục để tăng tốc truy vấn theo các trường thường dùng.
CREATE INDEX "showtime_seats_showtimeId_status_idx" ON "showtime_seats"("showtimeId", "status");

-- Tạo chỉ mục để tăng tốc truy vấn theo các trường thường dùng.
CREATE INDEX "showtime_seats_seatId_status_idx" ON "showtime_seats"("seatId", "status");

-- Tạo chỉ mục để tăng tốc truy vấn theo các trường thường dùng.
CREATE INDEX "showtime_seats_status_idx" ON "showtime_seats"("status");

-- Tạo chỉ mục để tăng tốc truy vấn theo các trường thường dùng.
CREATE INDEX "bookings_userId_createdAt_idx" ON "bookings"("userId", "createdAt");

-- Tạo chỉ mục để tăng tốc truy vấn theo các trường thường dùng.
CREATE INDEX "bookings_showtimeId_status_idx" ON "bookings"("showtimeId", "status");

-- Tạo chỉ mục để tăng tốc truy vấn theo các trường thường dùng.
CREATE INDEX "bookings_status_createdAt_idx" ON "bookings"("status", "createdAt");

-- Tạo chỉ mục để tăng tốc truy vấn theo các trường thường dùng.
CREATE UNIQUE INDEX "booking_items_bookingId_showtimeSeatId_key" ON "booking_items"("bookingId", "showtimeSeatId");

-- Tạo chỉ mục để tăng tốc truy vấn theo các trường thường dùng.
CREATE INDEX "booking_items_bookingId_idx" ON "booking_items"("bookingId");

-- Tạo chỉ mục để tăng tốc truy vấn theo các trường thường dùng.
CREATE INDEX "booking_items_showtimeSeatId_idx" ON "booking_items"("showtimeSeatId");

-- Tạo chỉ mục để tăng tốc truy vấn theo các trường thường dùng.
CREATE INDEX "payments_bookingId_status_idx" ON "payments"("bookingId", "status");

-- Tạo chỉ mục để tăng tốc truy vấn theo các trường thường dùng.
CREATE INDEX "payments_status_createdAt_idx" ON "payments"("status", "createdAt");

-- Tạo chỉ mục để tăng tốc truy vấn theo các trường thường dùng.
CREATE UNIQUE INDEX "tickets_qrToken_key" ON "tickets"("qrToken");

-- Tạo chỉ mục để tăng tốc truy vấn theo các trường thường dùng.
CREATE INDEX "tickets_bookingId_idx" ON "tickets"("bookingId");

-- Tạo chỉ mục để tăng tốc truy vấn theo các trường thường dùng.
CREATE INDEX "tickets_bookingItemId_idx" ON "tickets"("bookingItemId");

-- Tạo chỉ mục để tăng tốc truy vấn theo các trường thường dùng.
CREATE INDEX "tickets_status_expiresAt_idx" ON "tickets"("status", "expiresAt");

-- Tạo chỉ mục để tăng tốc truy vấn theo các trường thường dùng.
CREATE UNIQUE INDEX "ticket_check_ins_ticketId_key" ON "ticket_check_ins"("ticketId");

-- Tạo chỉ mục để tăng tốc truy vấn theo các trường thường dùng.
CREATE INDEX "ticket_check_ins_checkedInAt_idx" ON "ticket_check_ins"("checkedInAt");

-- Thêm khóa ngoại để bảo đảm tính toàn vẹn giữa các bảng liên quan.
ALTER TABLE "refresh_tokens"
    ADD CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Thêm khóa ngoại để bảo đảm tính toàn vẹn giữa các bảng liên quan.
ALTER TABLE "movie_genres"
    ADD CONSTRAINT "movie_genres_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "movies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Thêm khóa ngoại để bảo đảm tính toàn vẹn giữa các bảng liên quan.
ALTER TABLE "movie_genres"
    ADD CONSTRAINT "movie_genres_genreId_fkey" FOREIGN KEY ("genreId") REFERENCES "genres"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Thêm khóa ngoại để bảo đảm tính toàn vẹn giữa các bảng liên quan.
ALTER TABLE "rooms"
    ADD CONSTRAINT "rooms_cinemaId_fkey" FOREIGN KEY ("cinemaId") REFERENCES "cinemas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Thêm khóa ngoại để bảo đảm tính toàn vẹn giữa các bảng liên quan.
ALTER TABLE "seats"
    ADD CONSTRAINT "seats_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Thêm khóa ngoại để bảo đảm tính toàn vẹn giữa các bảng liên quan.
ALTER TABLE "showtimes"
    ADD CONSTRAINT "showtimes_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "movies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Thêm khóa ngoại để bảo đảm tính toàn vẹn giữa các bảng liên quan.
ALTER TABLE "showtimes"
    ADD CONSTRAINT "showtimes_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Thêm khóa ngoại để bảo đảm tính toàn vẹn giữa các bảng liên quan.
ALTER TABLE "showtime_seats"
    ADD CONSTRAINT "showtime_seats_showtimeId_fkey" FOREIGN KEY ("showtimeId") REFERENCES "showtimes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Thêm khóa ngoại để bảo đảm tính toàn vẹn giữa các bảng liên quan.
ALTER TABLE "showtime_seats"
    ADD CONSTRAINT "showtime_seats_seatId_fkey" FOREIGN KEY ("seatId") REFERENCES "seats"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Thêm khóa ngoại để bảo đảm tính toàn vẹn giữa các bảng liên quan.
ALTER TABLE "bookings"
    ADD CONSTRAINT "bookings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Thêm khóa ngoại để bảo đảm tính toàn vẹn giữa các bảng liên quan.
ALTER TABLE "bookings"
    ADD CONSTRAINT "bookings_showtimeId_fkey" FOREIGN KEY ("showtimeId") REFERENCES "showtimes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Thêm khóa ngoại để bảo đảm tính toàn vẹn giữa các bảng liên quan.
ALTER TABLE "booking_items"
    ADD CONSTRAINT "booking_items_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Thêm khóa ngoại để bảo đảm tính toàn vẹn giữa các bảng liên quan.
ALTER TABLE "booking_items"
    ADD CONSTRAINT "booking_items_showtimeSeatId_fkey" FOREIGN KEY ("showtimeSeatId") REFERENCES "showtime_seats"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Thêm khóa ngoại để bảo đảm tính toàn vẹn giữa các bảng liên quan.
ALTER TABLE "payments"
    ADD CONSTRAINT "payments_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Thêm khóa ngoại để bảo đảm tính toàn vẹn giữa các bảng liên quan.
ALTER TABLE "tickets"
    ADD CONSTRAINT "tickets_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Thêm khóa ngoại để bảo đảm tính toàn vẹn giữa các bảng liên quan.
ALTER TABLE "tickets"
    ADD CONSTRAINT "tickets_bookingItemId_fkey" FOREIGN KEY ("bookingItemId") REFERENCES "booking_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Thêm khóa ngoại để bảo đảm tính toàn vẹn giữa các bảng liên quan.
ALTER TABLE "ticket_check_ins"
    ADD CONSTRAINT "ticket_check_ins_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
