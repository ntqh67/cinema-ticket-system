UPDATE "staff_attendances"
SET "shiftCode" = CASE
  WHEN "shiftCode" IN ('A1', 'A2') THEN 'A'
  WHEN "shiftCode" IN ('B1', 'B2') THEN 'B'
  WHEN "shiftCode" IN ('C1', 'C2') THEN 'C'
  ELSE "shiftCode"
END
WHERE "shiftCode" IN ('A1', 'A2', 'B1', 'B2', 'C1', 'C2');
