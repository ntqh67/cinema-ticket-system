import { Role } from '@prisma/client';
import {
  ticketDiscountPercent,
  ticketPriceForRole,
} from './ticket-discount';

describe('ticket pricing by account role', () => {
  it.each([
    [Role.CUSTOMER, 0, 100_000],
    [Role.STAFF, 10, 90_000],
    [Role.ADMIN, 100, 0],
  ])(
    'applies the configured discount for %s',
    (role, expectedDiscount, expectedPrice) => {
      expect(ticketDiscountPercent(role)).toBe(expectedDiscount);
      expect(ticketPriceForRole(100_000, role)).toBe(expectedPrice);
    },
  );
});
