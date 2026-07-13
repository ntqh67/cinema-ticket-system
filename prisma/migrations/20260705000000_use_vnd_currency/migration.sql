-- Mục đích: Migration PostgreSQL; mỗi khối lần lượt thay đổi cấu trúc, chỉ mục hoặc khóa ngoại.
ALTER TABLE "bookings" ALTER COLUMN "currency" SET DEFAULT 'VND';
ALTER TABLE "payments" ALTER COLUMN "currency" SET DEFAULT 'VND';
UPDATE "bookings" SET "currency" = 'VND' WHERE "currency" = 'USD';
UPDATE "payments" SET "currency" = 'VND' WHERE "currency" = 'USD';
