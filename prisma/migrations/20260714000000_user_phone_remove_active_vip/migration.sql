ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "phone" TEXT;

UPDATE "seats"
SET "type" = 'STANDARD'
WHERE "type" = 'VIP';

UPDATE "cinema_ticket_prices"
SET "isActive" = false
WHERE "seatType" = 'VIP';

UPDATE "showtime_seats" AS ss
SET "price" = ctp."price"
FROM "seats" AS s, "showtimes" AS st, "rooms" AS r, "cinema_ticket_prices" AS ctp
WHERE ss."seatId" = s."id"
  AND st."id" = ss."showtimeId"
  AND r."id" = st."roomId"
  AND ctp."cinemaId" = r."cinemaId"
  AND ctp."seatType" = 'STANDARD'
  AND ctp."isActive" = true
  AND s."type" = 'STANDARD'
  AND ss."status" <> 'BOOKED';

UPDATE "booking_items" AS bi
SET "unitPrice" = ss."price"
FROM "bookings" AS b, "showtime_seats" AS ss
WHERE bi."bookingId" = b."id"
  AND bi."showtimeSeatId" = ss."id"
  AND b."status" = 'PENDING';

UPDATE "bookings" AS b
SET "totalAmount" = COALESCE(seats."seatSubtotal", 0) + COALESCE(combos."comboSubtotal", 0)
FROM (
  SELECT "bookingId", SUM("unitPrice") AS "seatSubtotal"
  FROM "booking_items"
  GROUP BY "bookingId"
) AS seats
LEFT JOIN (
  SELECT "bookingId", SUM("unitPrice" * "quantity") AS "comboSubtotal"
  FROM "booking_combo_items"
  GROUP BY "bookingId"
) AS combos ON combos."bookingId" = seats."bookingId"
WHERE b."id" = seats."bookingId"
  AND b."status" = 'PENDING';
