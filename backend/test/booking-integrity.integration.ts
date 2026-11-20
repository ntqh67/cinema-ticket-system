import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { PrismaService } from '../src/prisma/prisma.service';
import { RedisService } from '../src/redis/redis.service';
import { SeatHoldsService } from '../src/seat-holds/seat-holds.service';
import { SeatsService } from '../src/seats/seats.service';
import { BookingsService } from '../src/bookings/bookings.service';
import { AdminService } from '../src/admin/admin.service';
import { MovieStatusService } from '../src/movies/movie-status.service';

// Chỉ chạy trên DB kiểm thử được chỉ định; không kế thừa DATABASE_URL của dự án.
const databaseUrl = process.env.INTEGRITY_DATABASE_URL;
const redisUrl = process.env.INTEGRITY_REDIS_URL;
assert(
  databaseUrl && new URL(databaseUrl).pathname === '/cinema_integrity_test',
);
assert(redisUrl, 'Cần INTEGRITY_REDIS_URL của Redis kiểm thử riêng');
process.env.DATABASE_URL = databaseUrl;
process.env.REDIS_URL = redisUrl;
Object.assign(process.env, {
  SEPAY_ENABLED: 'true',
  SEPAY_BANK_ACCOUNT: '123456789',
  SEPAY_BANK_CODE: 'MB',
  SEPAY_ACCOUNT_NAME: 'INTEGRITY TEST',
  SEPAY_API_KEY: 'integrity-test-key',
  SEPAY_PAYMENT_PREFIX: 'CRT',
});

const prisma = new PrismaService();
const redis = new RedisService();
// Test tích hợp không cần kênh thời gian thực nên dùng gateway giả.
const holds = new SeatHoldsService(prisma, redis, {
  publishSeatsChanged: () => undefined,
} as never);
const bookings = new BookingsService(prisma, holds);
const admin = new AdminService(prisma, new MovieStatusService(prisma));
const seats = new SeatsService(prisma, holds);
const runId = randomUUID();
let cinemaId: string;
let movieId: string;
let userId: string;
let comboId: string;
let promotionId: string;
let completed = 0;
const holdKeys: string[] = [];

// Mỗi kịch bản có phòng/suất riêng để không chia sẻ trạng thái ghế với test khác.
async function fixture() {
  const room = await prisma.room.create({
    data: {
      cinemaId,
      name: randomUUID(),
      capacity: 2,
      seats: {
        create: [1, 2].map((number) => ({
          row: 'A',
          number,
          position: number,
        })),
      },
    },
  });
  const startAt = new Date(Date.now() + 86400000).toISOString();
  const endAt = new Date(Date.now() + 93600000).toISOString();
  const showtime = await admin.createShowtime({
    movieId,
    roomId: room.id,
    startAt,
    endAt,
    basePrice: 80000,
  });
  const showtimeSeats = await prisma.showtimeSeat.findMany({
    where: { showtimeId: showtime.id },
    orderBy: { id: 'asc' },
  });
  holdKeys.push(
    ...showtimeSeats.map((seat) => `seat_hold:${showtime.id}:${seat.id}`),
  );
  return { room, showtime, seat: showtimeSeats[0], startAt, endAt };
}

// Booking được tạo qua service thật, gồm Lua bind và transaction PostgreSQL.
async function pendingBooking() {
  const f = await fixture();
  await holds.hold(
    { showtimeId: f.showtime.id, showtimeSeatId: f.seat.id },
    { type: 'USER', userId },
  );
  const booking = await bookings.create(
    { showtimeId: f.showtime.id, showtimeSeatIds: [f.seat.id] },
    userId,
  );
  return { ...f, booking };
}

// Payload dựa trên mẫu SePay đã ghi trong docs/sepay-payment.md; không gọi ngân hàng.
function webhook(
  payment: { providerRef: string; amount: number },
  id = randomUUID(),
) {
  return {
    id,
    gateway: 'MBBank',
    accountNumber: '123456789',
    transferType: 'in',
    transferAmount: payment.amount,
    content: payment.providerRef,
  };
}

// Chờ PostgreSQL xác nhận request thứ hai đang đợi khóa, tránh test phụ thuộc tốc độ máy.
async function waitForBookingLock() {
  for (let attempt = 0; attempt < 200; attempt++) {
    const rows = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT count(*) FROM pg_stat_activity
      WHERE datname = current_database() AND pid <> pg_backend_pid()
      AND wait_event_type = 'Lock' AND query LIKE '%bookings%'`;
    if (Number(rows[0].count) > 0) return;
    await delay(10);
  }
  throw new Error('Không quan sát được request chờ khóa booking');
}

// Mô phỏng payment commit sau lần đọc ban đầu, trước lần ghi của request đang đợi.
async function finishPaymentBeforeMutation(
  bookingId: string,
  mutation: () => Promise<unknown>,
) {
  let operation: Promise<unknown> | undefined;
  await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "bookings" WHERE "id" = ${bookingId} FOR UPDATE`;
    operation = mutation();
    // Gắn handler ngay để không phát sinh unhandled rejection khi transaction nhả khóa.
    void operation.catch(() => {});
    await waitForBookingLock();
    await tx.booking.update({
      where: { id: bookingId },
      data: { status: 'PAID' },
    });
  });
  await assert.rejects(operation!, /không còn chờ thanh toán/);
}

// In tên kịch bản sau khi toàn bộ assertion đã chạy thành công.
async function check(name: string, action: () => Promise<void>) {
  await action();
  console.log(`PASS ${++completed}: ${name}`);
}

async function main() {
  const user = await prisma.user.create({
    data: { email: `${runId}@integrity.test`, passwordHash: 'test-only' },
  });
  userId = user.id;
  const movie = await prisma.movie.create({
    data: { title: runId, durationMin: 120, status: 'NOW_SHOWING' },
  });
  movieId = movie.id;
  const cinema = await prisma.cinema.create({
    data: {
      name: runId,
      city: 'Đà Nẵng',
      ticketPrices: { create: { seatType: 'STANDARD', price: 80000 } },
    },
  });
  cinemaId = cinema.id;
  const combo = await prisma.concessionCombo.create({
    data: { name: runId, price: 50000 },
  });
  comboId = combo.id;
  const promotion = await prisma.promotion.create({
    data: { code: runId.toUpperCase(), name: runId, discountPercent: 100 },
  });
  promotionId = promotion.id;

  await check(
    'Guest → USER; proof cũ không thể chiếm/nhả hold đã chuyển; TTL và DB giữ đúng trạng thái',
    async () => {
      const f = await fixture();
      const guest = { type: 'GUEST' as const, guestSessionId: randomUUID() };
      const dto = { showtimeId: f.showtime.id, showtimeSeatId: f.seat.id };
      await assert.rejects(holds.hold(dto), /guestSessionId/);
      await holds.hold(dto, guest);
      const actor = {
        type: 'USER' as const,
        userId,
        guestSessionId: guest.guestSessionId,
      };
      const map = await seats.findByShowtime(f.showtime.id, actor);
      assert.equal(
        map.seats.find((item) => item.showtimeSeatId === f.seat.id)
          ?.claimableByMe,
        true,
      );
      await holds.hold(dto, actor);
      await assert.rejects(holds.release(f.seat.id, guest), /another customer/);
      await assert.rejects(
        holds.hold(dto, { ...actor, userId: 'other-user' }),
        /another customer/,
      );
      const current = await holds.listByShowtime(f.showtime.id, [f.seat.id]);
      assert.equal(current[0].ownerType, 'USER');
      assert.equal('guestSessionId' in current[0], false);
      assert.equal(
        (
          await prisma.showtimeSeat.findUniqueOrThrow({
            where: { id: f.seat.id },
          })
        ).status,
        'AVAILABLE',
      );
      const ttl = Number(
        await redis.eval("return redis.call('TTL', KEYS[1])", [
          `seat_hold:${f.showtime.id}:${f.seat.id}`,
        ]),
      );
      assert(ttl > 0 && ttl <= 300);
      assert.equal((await holds.release(f.seat.id, actor)).released, true);
    },
  );

  await check(
    'Lua bind từ guest nguyên tử: một ghế khác chủ khiến cả nhóm không đổi',
    async () => {
      const f = await fixture();
      const allSeats = await prisma.showtimeSeat.findMany({
        where: { showtimeId: f.showtime.id },
      });
      const guestSessionId = randomUUID();
      await holds.hold(
        { showtimeId: f.showtime.id, showtimeSeatId: allSeats[0].id },
        { type: 'GUEST', guestSessionId },
      );
      await holds.hold(
        { showtimeId: f.showtime.id, showtimeSeatId: allSeats[1].id },
        { type: 'GUEST', guestSessionId: 'other-guest' },
      );
      await assert.rejects(
        holds.bindHoldsToUser({
          showtimeId: f.showtime.id,
          showtimeSeatIds: allSeats.map((s) => s.id),
          actor: { type: 'USER', userId, guestSessionId },
        }),
      );
      assert(
        (
          await holds.listByShowtime(
            f.showtime.id,
            allSeats.map((s) => s.id),
          )
        ).every((hold) => hold.ownerType === 'GUEST'),
      );
      await holds.bindHoldsToUser({
        showtimeId: f.showtime.id,
        showtimeSeatIds: [allSeats[0].id],
        actor: { type: 'USER', userId, guestSessionId },
      });
      await assert.rejects(
        holds.bindHoldsToUser({
          showtimeId: f.showtime.id,
          showtimeSeatIds: [allSeats[0].id],
          actor: { type: 'USER', userId: 'other-user', guestSessionId },
        }),
      );
    },
  );

  await check(
    'Tạo lại QR sau đổi combo có mã mới; callback lặp/đồng thời chỉ phát hành một vé',
    async () => {
      const f = await pendingBooking();
      const old = await bookings.createSepayPayment(f.booking.id, userId);
      await bookings.updateBookingCombos(
        f.booking.id,
        { items: [{ comboId, quantity: 1 }] },
        userId,
      );
      const [next, repeated] = await Promise.all([
        bookings.createSepayPayment(f.booking.id, userId),
        bookings.createSepayPayment(f.booking.id, userId),
      ]);
      assert.notEqual(next.providerRef, old.providerRef);
      assert.equal(next.paymentId, repeated.paymentId);
      assert.equal(next.amount, 130000);
      const ignored = await bookings.handleSepayWebhook(
        'Apikey integrity-test-key',
        webhook(old),
      );
      assert.equal('ignored' in ignored && ignored.ignored, true);
      const event = webhook(next);
      await Promise.all([
        bookings.handleSepayWebhook('Apikey integrity-test-key', event),
        bookings.handleSepayWebhook('Apikey integrity-test-key', event),
      ]);
      await bookings.handleSepayWebhook('Apikey integrity-test-key', event);
      assert.equal(
        await prisma.ticket.count({ where: { bookingId: f.booking.id } }),
        1,
      );
      assert.equal(
        await prisma.payment.count({
          where: { bookingId: f.booking.id, status: 'SUCCESS' },
        }),
        1,
      );
      assert.equal(
        (
          await prisma.booking.findUniqueOrThrow({
            where: { id: f.booking.id },
          })
        ).status,
        'PAID',
      );
      assert.equal(
        (
          await prisma.showtimeSeat.findUniqueOrThrow({
            where: { id: f.seat.id },
          })
        ).status,
        'BOOKED',
      );
      await assert.rejects(
        admin.generateSeats(f.room.id, { rows: ['A'], columns: 3 }),
        /đã có suất chiếu/,
      );
      assert.equal(
        await prisma.ticket.count({ where: { bookingId: f.booking.id } }),
        1,
      );
    },
  );

  await check(
    'Ưu đãi 100% hủy QR cũ, phát hành vé 0đ và retry không tạo vé trùng',
    async () => {
      const f = await pendingBooking();
      const payment = await bookings.createSepayPayment(f.booking.id, userId);
      await bookings.applyPromotion(
        f.booking.id,
        { code: promotion.code },
        userId,
      );
      assert.equal(
        (
          await prisma.payment.findUniqueOrThrow({
            where: { id: payment.paymentId },
          })
        ).status,
        'CANCELLED',
      );
      const paid = await bookings.pay(f.booking.id, userId);
      assert.equal(paid.payment.amount, 0);
      const repeated = await bookings.pay(f.booking.id, userId);
      assert.equal(paid.payment.id, repeated.payment.id);
      assert.equal(
        await prisma.ticket.count({ where: { bookingId: f.booking.id } }),
        1,
      );
    },
  );

  await check(
    'Webhook đang đợi khóa không được hồi sinh booking vừa hủy',
    async () => {
      const f = await pendingBooking();
      const payment = await bookings.createSepayPayment(f.booking.id, userId);
      let response:
        ReturnType<BookingsService['handleSepayWebhook']> | undefined;
      await prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT "id" FROM "bookings" WHERE "id" = ${f.booking.id} FOR UPDATE`;
        response = bookings.handleSepayWebhook(
          'Apikey integrity-test-key',
          webhook(payment),
        );
        void response.catch(() => {});
        await waitForBookingLock();
        await tx.booking.update({
          where: { id: f.booking.id },
          data: { status: 'CANCELLED' },
        });
        await tx.payment.update({
          where: { id: payment.paymentId },
          data: { status: 'CANCELLED' },
        });
      });
      const result = await response!;
      assert.equal('reviewRequired' in result && result.reviewRequired, true);
      assert.equal(
        await prisma.ticket.count({ where: { bookingId: f.booking.id } }),
        0,
      );
      assert.equal(
        (
          await prisma.booking.findUniqueOrThrow({
            where: { id: f.booking.id },
          })
        ).status,
        'CANCELLED',
      );
      assert.equal(
        (
          await prisma.showtimeSeat.findUniqueOrThrow({
            where: { id: f.seat.id },
          })
        ).status,
        'AVAILABLE',
      );
    },
  );

  await check(
    'Hủy đơn đợi payment commit phải bị từ chối, không ghi đè PAID',
    async () => {
      const f = await pendingBooking();
      await finishPaymentBeforeMutation(f.booking.id, () =>
        bookings.cancel(f.booking.id, userId),
      );
      assert.equal(
        (
          await prisma.booking.findUniqueOrThrow({
            where: { id: f.booking.id },
          })
        ).status,
        'PAID',
      );
    },
  );

  await check(
    'Đổi combo đợi payment commit không được thêm hàng hay tăng tổng tiền',
    async () => {
      const f = await pendingBooking();
      await finishPaymentBeforeMutation(f.booking.id, () =>
        bookings.updateBookingCombos(
          f.booking.id,
          { items: [{ comboId, quantity: 1 }] },
          userId,
        ),
      );
      assert.equal(
        await prisma.bookingComboItem.count({
          where: { bookingId: f.booking.id },
        }),
        0,
      );
      assert.equal(
        Number(
          (
            await prisma.booking.findUniqueOrThrow({
              where: { id: f.booking.id },
            })
          ).totalAmount,
        ),
        80000,
      );
    },
  );

  await check(
    'Tăng giá admin giữ nguyên snapshot booking/payment; booking mới dùng giá mới',
    async () => {
      const f = await pendingBooking();
      const payment = await bookings.createSepayPayment(f.booking.id, userId);
      await admin.upsertCinemaTicketPrice(cinemaId, {
        seatType: 'STANDARD',
        price: 120000,
      });
      assert.equal(
        Number(
          (
            await prisma.booking.findUniqueOrThrow({
              where: { id: f.booking.id },
            })
          ).totalAmount,
        ),
        80000,
      );
      assert.equal(
        Number(
          (
            await prisma.payment.findUniqueOrThrow({
              where: { id: payment.paymentId },
            })
          ).amount,
        ),
        80000,
      );
      assert.equal(
        Number(
          (
            await prisma.showtimeSeat.findUniqueOrThrow({
              where: { id: f.seat.id },
            })
          ).price,
        ),
        120000,
      );
      await bookings.handleSepayWebhook(
        'Apikey integrity-test-key',
        webhook(payment),
      );
      const newer = await pendingBooking();
      assert.equal(newer.booking.totalAmount, 120000);
      await admin.upsertCinemaTicketPrice(cinemaId, {
        seatType: 'STANDARD',
        price: 80000,
      });
    },
  );

  await check(
    'Chuyển phòng tái tạo đúng ghế; suất có booking không được đổi/xóa',
    async () => {
      const f = await fixture();
      const room = await prisma.room.create({
        data: {
          cinemaId,
          name: randomUUID(),
          capacity: 1,
          seats: { create: { row: 'B', number: 1, position: 1 } },
        },
      });
      await admin.updateShowtime(f.showtime.id, {
        movieId,
        roomId: room.id,
        startAt: f.startAt,
        endAt: f.endAt,
        basePrice: 80000,
      });
      const mapped = await prisma.showtimeSeat.findMany({
        where: { showtimeId: f.showtime.id },
        include: { seat: true },
      });
      assert.equal(mapped.length, 1);
      assert(mapped.every((item) => item.seat.roomId === room.id));
      const booked = await pendingBooking();
      await assert.rejects(
        admin.updateShowtime(booked.showtime.id, {
          movieId,
          roomId: room.id,
          startAt: f.startAt,
          endAt: f.endAt,
          basePrice: 80000,
        }),
        /đã có booking/,
      );
      await assert.rejects(
        admin.deleteShowtime(booked.showtime.id),
        /đã có booking/,
      );
    },
  );

  await check(
    'Phòng chưa có suất vẫn tạo lại ghế được; hai suất trùng giờ chỉ tạo một',
    async () => {
      const room = await prisma.room.create({
        data: { cinemaId, name: randomUUID(), capacity: 0 },
      });
      await admin.generateSeats(room.id, { rows: ['A'], columns: 2 });
      assert.equal(await prisma.seat.count({ where: { roomId: room.id } }), 2);
      const dto = {
        movieId,
        roomId: room.id,
        startAt: new Date(Date.now() + 86400000).toISOString(),
        endAt: new Date(Date.now() + 93600000).toISOString(),
        basePrice: 80000,
      };
      const results = await Promise.allSettled([
        admin.createShowtime(dto),
        admin.createShowtime(dto),
      ]);
      assert.equal(
        results.filter((result) => result.status === 'fulfilled').length,
        1,
      );
    },
  );
}

// Chỉ xóa fixture do lần chạy này tạo; không FLUSHDB và không reset schema.
main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      if (holdKeys.length) await redis.del(...holdKeys);
      if (cinemaId) await prisma.cinema.delete({ where: { id: cinemaId } });
      if (movieId) await prisma.movie.delete({ where: { id: movieId } });
      if (userId) await prisma.user.delete({ where: { id: userId } });
      if (comboId)
        await prisma.concessionCombo.delete({ where: { id: comboId } });
      if (promotionId)
        await prisma.promotion.delete({ where: { id: promotionId } });
    } finally {
      await prisma.$disconnect();
    }
  });
