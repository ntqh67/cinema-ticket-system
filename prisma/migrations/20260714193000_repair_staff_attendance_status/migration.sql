UPDATE "staff_attendances"
SET "status" = CASE
  WHEN "shiftCode" = 'A' AND "checkInAt" > ("workDate" + TIME '01:15') THEN 'LATE'::"AttendanceStatus"
  WHEN "shiftCode" = 'B' AND "checkInAt" > ("workDate" + TIME '09:15') THEN 'LATE'::"AttendanceStatus"
  WHEN "shiftCode" = 'C' AND "checkInAt" > ("workDate" + TIME '11:15') THEN 'LATE'::"AttendanceStatus"
  ELSE 'PRESENT'::"AttendanceStatus"
END
WHERE "checkInAt" IS NOT NULL
  AND "shiftCode" IN ('A', 'B', 'C')
  AND "status" IN ('PRESENT', 'LATE');
