export const STAFF_SHIFTS = {
  A: { name: 'Ca A', start: '08:00', end: '16:00' },
  B: { name: 'Ca B', start: '16:00', end: '23:00' },
  C: { name: 'Ca C', start: '18:00', end: '03:00' },
} as const;

export type StaffShiftCode = keyof typeof STAFF_SHIFTS;

export function resolveStaffAttendanceStatus(
  workDate: string,
  checkInAt: Date | null,
  shiftCode: string | null,
  storedStatus: 'PRESENT' | 'LATE' | 'ABSENT' | 'LEAVE',
) {
  if (
    !checkInAt ||
    !shiftCode ||
    !(shiftCode in STAFF_SHIFTS) ||
    storedStatus === 'ABSENT' ||
    storedStatus === 'LEAVE'
  ) {
    return storedStatus;
  }
  const shift = STAFF_SHIFTS[shiftCode as StaffShiftCode];
  const [hour, minute] = shift.start.split(':').map(Number);
  const lateTotalMinutes = hour * 60 + minute + 15;
  const lateAt = new Date(
    `${workDate}T${String(Math.floor(lateTotalMinutes / 60) % 24).padStart(2, '0')}:${String(lateTotalMinutes % 60).padStart(2, '0')}:00.000+07:00`,
  );
  return checkInAt > lateAt ? 'LATE' : 'PRESENT';
}
