-- Mục đích: Migration PostgreSQL; mỗi khối lần lượt thay đổi cấu trúc, chỉ mục hoặc khóa ngoại.
ALTER TABLE "seats" ADD COLUMN "position" INTEGER;

UPDATE "seats" SET "position" = "number" WHERE "position" IS NULL;

ALTER TABLE "seats" ALTER COLUMN "position" SET NOT NULL;

CREATE UNIQUE INDEX "seats_roomId_row_position_key"
ON "seats"("roomId", "row", "position");
