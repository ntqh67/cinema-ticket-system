CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'LATE', 'ABSENT', 'LEAVE');

CREATE TABLE "staff_attendances" (
    "id" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "workDate" DATE NOT NULL,
    "checkInAt" TIMESTAMP(3),
    "checkOutAt" TIMESTAMP(3),
    "status" "AttendanceStatus" NOT NULL DEFAULT 'PRESENT',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "staff_attendances_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "staff_attendances_staffId_workDate_key"
ON "staff_attendances"("staffId", "workDate");

CREATE INDEX "staff_attendances_workDate_idx"
ON "staff_attendances"("workDate");

ALTER TABLE "staff_attendances"
ADD CONSTRAINT "staff_attendances_staffId_fkey"
FOREIGN KEY ("staffId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
