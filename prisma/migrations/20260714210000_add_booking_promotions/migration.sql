-- Tạo nguồn dữ liệu mã ưu đãi và lưu số tiền giảm đã áp cho từng booking.
CREATE TABLE "promotions" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "discountPercent" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "promotions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "promotions_discount_percent_check" CHECK ("discountPercent" BETWEEN 0 AND 100)
);

CREATE TABLE "booking_promotions" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "promotionId" TEXT NOT NULL,
    "originalAmount" DECIMAL(10,2) NOT NULL,
    "discountAmount" DECIMAL(10,2) NOT NULL,
    "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "booking_promotions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "booking_promotions_amount_check" CHECK (
        "originalAmount" >= 0
        AND "discountAmount" >= 0
        AND "discountAmount" <= "originalAmount"
    )
);

CREATE UNIQUE INDEX "promotions_code_key" ON "promotions"("code");
CREATE INDEX "promotions_isActive_startsAt_endsAt_idx" ON "promotions"("isActive", "startsAt", "endsAt");
CREATE UNIQUE INDEX "booking_promotions_bookingId_key" ON "booking_promotions"("bookingId");
CREATE INDEX "booking_promotions_promotionId_appliedAt_idx" ON "booking_promotions"("promotionId", "appliedAt");

ALTER TABLE "booking_promotions"
ADD CONSTRAINT "booking_promotions_bookingId_fkey"
FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "booking_promotions"
ADD CONSTRAINT "booking_promotions_promotionId_fkey"
FOREIGN KEY ("promotionId") REFERENCES "promotions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Mã demo giảm toàn bộ giá trị booking, gồm cả vé và combo.
INSERT INTO "promotions" (
    "id",
    "code",
    "name",
    "discountPercent",
    "isActive",
    "createdAt",
    "updatedAt"
) VALUES (
    'promo-uudai100',
    'UUDAI100',
    'Ưu đãi toàn bộ đơn hàng',
    100,
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);
