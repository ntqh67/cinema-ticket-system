-- Store the final screening date so movie status can be derived consistently.
ALTER TABLE "movies" ADD COLUMN "endDate" TIMESTAMP(3);

CREATE INDEX "movies_endDate_idx" ON "movies"("endDate");
