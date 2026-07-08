ALTER TABLE "movies" ADD COLUMN "tmdbId" INTEGER;

CREATE INDEX "movies_tmdbId_idx" ON "movies"("tmdbId");
