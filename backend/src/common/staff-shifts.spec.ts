import { resolveStaffAttendanceStatus } from './staff-shifts';

describe('staff attendance status', () => {
  it('marks a 12:49 check-in for shift A as late', () => {
    expect(
      resolveStaffAttendanceStatus(
        '2026-07-14',
        new Date('2026-07-14T12:49:48+07:00'),
        'A',
        'PRESENT',
      ),
    ).toBe('LATE');
  });

  it('keeps the 15 minute grace period', () => {
    expect(
      resolveStaffAttendanceStatus(
        '2026-07-14',
        new Date('2026-07-14T08:10:00+07:00'),
        'A',
        'LATE',
      ),
    ).toBe('PRESENT');
  });
});
