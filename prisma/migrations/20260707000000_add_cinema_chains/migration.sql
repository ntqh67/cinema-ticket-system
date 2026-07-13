-- Mục đích: Migration PostgreSQL; mỗi khối lần lượt thay đổi cấu trúc, chỉ mục hoặc khóa ngoại.
CREATE TABLE "cinema_chains" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "city" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "cinema_chains_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "cinemas" ADD COLUMN "chainId" TEXT;

CREATE UNIQUE INDEX "cinema_chains_name_city_key" ON "cinema_chains"("name", "city");
CREATE INDEX "cinema_chains_city_idx" ON "cinema_chains"("city");
CREATE INDEX "cinema_chains_name_idx" ON "cinema_chains"("name");
CREATE INDEX "cinemas_chainId_idx" ON "cinemas"("chainId");

ALTER TABLE "cinemas"
ADD CONSTRAINT "cinemas_chainId_fkey"
FOREIGN KEY ("chainId") REFERENCES "cinema_chains"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
