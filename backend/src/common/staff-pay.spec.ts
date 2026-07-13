import { calculateStaffPay } from './staff-pay';

describe('staff pay', () => {
  it('uses the normal rate between 08:00 and 22:00', () => {
    expect(
      calculateStaffPay(
        new Date('2026-07-14T08:00:00+07:00'),
        new Date('2026-07-14T16:00:00+07:00'),
      ).salary,
    ).toBe(200_000);
  });

  it('adds 30 percent after 22:00 and handles a shift across midnight', () => {
    expect(
      calculateStaffPay(
        new Date('2026-07-14T18:00:00+07:00'),
        new Date('2026-07-15T03:00:00+07:00'),
      ).salary,
    ).toBe(262_500);
  });
});
