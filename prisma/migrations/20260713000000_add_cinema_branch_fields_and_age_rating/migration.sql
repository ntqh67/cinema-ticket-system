-- Mục đích: Migration PostgreSQL; mỗi khối lần lượt thay đổi cấu trúc, chỉ mục hoặc khóa ngoại.
ALTER TABLE "movies"
ADD COLUMN "ageRating" TEXT NOT NULL DEFAULT 'P';

ALTER TABLE "cinemas"
ADD COLUMN "code" TEXT,
ADD COLUMN "ward" TEXT;

CREATE UNIQUE INDEX "cinemas_code_key" ON "cinemas"("code");
CREATE INDEX "cinemas_code_idx" ON "cinemas"("code");
CREATE INDEX "cinemas_ward_idx" ON "cinemas"("ward");
