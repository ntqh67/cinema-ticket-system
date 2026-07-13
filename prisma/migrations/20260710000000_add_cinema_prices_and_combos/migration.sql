-- Mục đích: Migration PostgreSQL; mỗi khối lần lượt thay đổi cấu trúc, chỉ mục hoặc khóa ngoại.
CREATE TABLE "cinema_ticket_prices" (
    "id" TEXT NOT NULL,
    "cinemaId" TEXT NOT NULL,
    "seatType" "SeatType" NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cinema_ticket_prices_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "concession_combos" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL(10,2) NOT NULL,
    "imageUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "concession_combos_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "booking_combo_items" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "comboId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "booking_combo_items_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "cinema_ticket_prices_cinemaId_seatType_key" ON "cinema_ticket_prices"("cinemaId", "seatType");
CREATE INDEX "cinema_ticket_prices_cinemaId_isActive_idx" ON "cinema_ticket_prices"("cinemaId", "isActive");
CREATE INDEX "cinema_ticket_prices_seatType_idx" ON "cinema_ticket_prices"("seatType");

CREATE INDEX "concession_combos_isActive_idx" ON "concession_combos"("isActive");
CREATE INDEX "concession_combos_name_idx" ON "concession_combos"("name");

CREATE UNIQUE INDEX "booking_combo_items_bookingId_comboId_key" ON "booking_combo_items"("bookingId", "comboId");
CREATE INDEX "booking_combo_items_bookingId_idx" ON "booking_combo_items"("bookingId");
CREATE INDEX "booking_combo_items_comboId_idx" ON "booking_combo_items"("comboId");

ALTER TABLE "cinema_ticket_prices" ADD CONSTRAINT "cinema_ticket_prices_cinemaId_fkey" FOREIGN KEY ("cinemaId") REFERENCES "cinemas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "booking_combo_items" ADD CONSTRAINT "booking_combo_items_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "booking_combo_items" ADD CONSTRAINT "booking_combo_items_comboId_fkey" FOREIGN KEY ("comboId") REFERENCES "concession_combos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
