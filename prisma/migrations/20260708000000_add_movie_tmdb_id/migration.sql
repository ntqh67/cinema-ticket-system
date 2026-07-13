-- Mục đích: Migration PostgreSQL; mỗi khối lần lượt thay đổi cấu trúc, chỉ mục hoặc khóa ngoại.
ALTER TABLE "movies" ADD COLUMN "tmdbId" INTEGER;

CREATE INDEX "movies_tmdbId_idx" ON "movies"("tmdbId");
