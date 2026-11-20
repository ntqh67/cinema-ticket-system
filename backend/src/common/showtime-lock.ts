import { Prisma } from '@prisma/client';

// Booking và quản trị dùng cùng khóa suất chiếu; transaction luôn do service sở hữu.
export async function lockShowtime(
  tx: Prisma.TransactionClient,
  showtimeId: string,
) {
  await tx.$queryRaw`SELECT "id" FROM "showtimes" WHERE "id" = ${showtimeId} FOR UPDATE`;
}
