-- Mục đích: Migration PostgreSQL; mỗi khối lần lượt thay đổi cấu trúc, chỉ mục hoặc khóa ngoại.
CREATE TABLE "movie_reviews" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "movieId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "movie_reviews_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "movie_reviews_rating_check" CHECK ("rating" >= 1 AND "rating" <= 10)
);

CREATE UNIQUE INDEX "movie_reviews_userId_movieId_key" ON "movie_reviews"("userId", "movieId");
CREATE INDEX "movie_reviews_movieId_idx" ON "movie_reviews"("movieId");
CREATE INDEX "movie_reviews_userId_idx" ON "movie_reviews"("userId");

ALTER TABLE "movie_reviews" ADD CONSTRAINT "movie_reviews_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "movie_reviews" ADD CONSTRAINT "movie_reviews_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "movies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
