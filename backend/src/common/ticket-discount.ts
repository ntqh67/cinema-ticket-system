import { Role } from '@prisma/client';

export function ticketDiscountPercent(role: Role) {
  if (role === Role.ADMIN) return 100;
  if (role === Role.STAFF) return 10;
  return 0;
}

export function ticketPriceForRole(price: number, role: Role) {
  const discountPercent = ticketDiscountPercent(role);
  return Math.round(price * (1 - discountPercent / 100));
}
