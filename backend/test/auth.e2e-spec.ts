/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument, @typescript-eslint/require-await */
// Fixture Prisma/Jest chỉ mô phỏng các delegate cần thiết; kiểu production vẫn được kiểm tra đầy đủ.
import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { sign } from 'jsonwebtoken';
import * as bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';
import { AuthModule } from '../src/auth/auth.module';
import { AuthService } from '../src/auth/auth.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { UsersController } from '../src/users/users.controller';
import { UsersService } from '../src/users/users.service';
import { BookingsController } from '../src/bookings/bookings.controller';
import { AdminBookingsController } from '../src/bookings/admin-bookings.controller';
import { TicketsController } from '../src/bookings/tickets.controller';
import { TicketCheckinsController } from '../src/bookings/ticket-checkins.controller';
import { BookingsService } from '../src/bookings/bookings.service';
import { SeatHoldsService } from '../src/seat-holds/seat-holds.service';
import { AdminController } from '../src/admin/admin.controller';
import { AdminService } from '../src/admin/admin.service';
import { StaffController } from '../src/staff/staff.controller';
import { StaffService } from '../src/staff/staff.service';
import { MoviesController } from '../src/movies/movies.controller';
import { MoviesService } from '../src/movies/movies.service';
import { MovieStatusService } from '../src/movies/movie-status.service';

// Test HTTP dùng controller, guard và service thật; chỉ giả lập hạ tầng PostgreSQL/Redis.
describe('Identity and authorization (HTTP)', () => {
  let app: INestApplication;
  let auth: AuthService;
  let bookings: BookingsService;
  const users = new Map<string, any>();
  const sessions = new Map<string, any>();
  const prisma = {
    $queryRaw: jest.fn().mockResolvedValue([]),
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    refreshToken: { create: jest.fn().mockResolvedValue({}) },
    authSession: {
      create: jest.fn(),
      findUnique: jest.fn(),
      updateMany: jest.fn(),
    },
    booking: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    movie: { findUnique: jest.fn() },
    movieReview: {
      upsert: jest.fn(),
      aggregate: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    ticket: { findMany: jest.fn() },
    $transaction: jest.fn(),
  };
  // Access token JWT thật cho phiên 'session-<id>' của user <id>; authVersion mặc định 0.
  const token = (id: string, authVersion = 0) =>
    sign(
      { sub: id, sid: 'session-' + id, authVersion, role: 'x' },
      process.env.JWT_ACCESS_SECRET as string,
      { algorithm: 'HS256', expiresIn: 600 },
    );
  const header = (id: string) => 'Bearer ' + token(id);
  const user = (id: string, role: Role = Role.CUSTOMER) => ({
    id,
    username: id,
    email: id + '@example.com',
    passwordHash: bcrypt.hashSync('secret123', 4),
    authVersion: 0,
    firstName: id,
    lastName: null,
    phone: null,
    role,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AuthModule],
      controllers: [
        UsersController,
        BookingsController,
        AdminBookingsController,
        TicketsController,
        TicketCheckinsController,
        AdminController,
        StaffController,
        MoviesController,
      ],
      providers: [
        UsersService,
        BookingsService,
        MoviesService,
        { provide: SeatHoldsService, useValue: {} },
        { provide: MovieStatusService, useValue: {} },
        {
          provide: AdminService,
          useValue: { getDashboard: () => ({ ok: true }) },
        },
        {
          provide: StaffService,
          useValue: { getAttendance: () => ({ ok: true }) },
        },
      ],
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();
    auth = module.get(AuthService);
    bookings = module.get(BookingsService);
  });
  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
    users.clear();
    prisma.refreshToken.create.mockResolvedValue({});
    sessions.clear();
    for (const [id, role] of [
      ['a', Role.CUSTOMER],
      ['b', Role.CUSTOMER],
      ['c', Role.STAFF],
      ['d', Role.ADMIN],
    ] as const) {
      users.set(id, user(id, role));
      sessions.set('session-' + id, {
        id: 'session-' + id,
        userId: id,
        expiresAt: new Date(Date.now() + 3600000),
        revokedAt: null,
        lastUsedAt: null,
        createdAt: new Date(),
      });
    }
    prisma.user.findUnique.mockImplementation(async ({ where }) =>
      where.id
        ? users.get(where.id)
        : [...users.values()].find((u) => u.email === where.email),
    );
    prisma.user.findFirst.mockImplementation(async ({ where }) =>
      [...users.values()].find((u) =>
        where.OR.some(
          (filter: any) =>
            filter.email === u.email || filter.username === u.username,
        ),
      ),
    );
    prisma.user.create.mockImplementation(async ({ data }) => {
      const created = { ...user('new'), ...data };
      users.set(created.id, created);
      return created;
    });
    prisma.user.update.mockImplementation(async ({ where, data }) => {
      const updated = { ...users.get(where.id), ...data };
      users.set(where.id, updated);
      return updated;
    });
    prisma.authSession.create.mockImplementation(async ({ data }) => {
      const session = {
        id: 'session-' + sessions.size,
        revokedAt: null,
        lastUsedAt: null,
        ...data,
      };
      sessions.set(session.id, session);
      return session;
    });
    prisma.authSession.findUnique.mockImplementation(async ({ where }) => {
      const session = sessions.get(where.id);
      return session ? { ...session, user: users.get(session.userId) } : null;
    });
    prisma.authSession.updateMany.mockImplementation(
      async ({ where, data }) => {
        let count = 0;
        for (const session of sessions.values()) {
          if (session.id === where.id && !session.revokedAt) {
            Object.assign(session, data);
            count++;
          }
        }
        return { count };
      },
    );
    prisma.booking.findUnique.mockResolvedValue({
      id: 'booking-b',
      userId: 'b',
      status: 'PENDING',
      bookingItems: [],
    });
    prisma.booking.findMany.mockResolvedValue([]);
    prisma.ticket.findMany.mockResolvedValue([]);
    prisma.$transaction.mockImplementation(async (callback) =>
      callback(prisma),
    );
  });

  it('registers normalized email, bcrypt password, CUSTOMER role and hash-only session', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        name: 'New User',
        email: ' NEW@EXAMPLE.COM ',
        password: 'secret123',
        role: 'ADMIN',
        isActive: false,
      })
      .expect(201);
    expect(response.body.user).toMatchObject({
      email: 'new@example.com',
      role: 'user',
    });
    expect(response.body.user.passwordHash).toBeUndefined();
    expect(
      await bcrypt.compare('secret123', users.get('new').passwordHash),
    ).toBe(true);
    // Access token là JWT; refresh token chỉ được lưu dưới dạng hash.
    expect(response.body.accessToken).toMatch(/^[\w-]+\.[\w-]+\.[\w-]+$/);
    const stored = prisma.refreshToken.create.mock.calls[0][0].data;
    expect(stored.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(stored.tokenHash).not.toBe(response.body.refreshToken);
    expect(stored).not.toHaveProperty('refreshToken');
  });

  it('rejects duplicate email', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ name: 'User A', email: 'A@example.com', password: 'secret123' })
      .expect(409);
  });

  it.each([
    { email: 'invalid', password: 'secret123' },
    { email: 'new@example.com', password: 'short' },
    { email: 'new@example.com', password: 'é'.repeat(37) },
  ])('rejects invalid registration %#', async (input) => {
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ name: 'New User', ...input })
      .expect(400);
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it.each(['a', 'A@EXAMPLE.COM'])(
    'logs in with username/email %s',
    async (identifier) => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ identifier, password: 'secret123' })
        .expect(201);
      expect(response.body.user.id).toBe('a');
      expect(response.body.user.passwordHash).toBeUndefined();
      await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', 'Bearer ' + response.body.accessToken)
        .expect(200);
    },
  );
  it('rejects wrong password', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ identifier: 'a', password: 'wrong123' })
      .expect(401);
  });
  it('rejects inactive user at login and on existing sessions', async () => {
    users.get('a').isActive = false;
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ identifier: 'a', password: 'secret123' })
      .expect(401);
    await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Authorization', header('a'))
      .expect(401);
  });
  it.each([
    '',
    'Basic x',
    'Bearer invalid',
    'Bearer ' + 'f'.repeat(64),
    header('a') + ' extra',
  ])('rejects missing/malformed/unknown token %#', async (authorization) => {
    await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Authorization', authorization)
      .expect(401);
  });
  it.each(['expired', 'revoked'])('rejects %s session', async (state) => {
    const session = [...sessions.values()][0];
    if (state === 'expired') session.expiresAt = new Date(Date.now() - 1);
    else session.revokedAt = new Date();
    await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Authorization', header('a'))
      .expect(401);
  });
  it('me returns session user and no internal auth fields', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/auth/me?userId=b')
      .set('Authorization', header('a'))
      .expect(200);
    expect(response.body.user.id).toBe('a');
    for (const key of ['passwordHash', 'tokenHash', 'authSessions'])
      expect(response.body.user).not.toHaveProperty(key);
  });
  it('logout revokes current session and keeps another device working', async () => {
    const second = await auth.login({ identifier: 'a', password: 'secret123' });
    await request(app.getHttpServer())
      .post('/api/auth/logout')
      .set('Authorization', header('a'))
      .expect(201);
    await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Authorization', header('a'))
      .expect(401);
    await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Authorization', 'Bearer ' + second.accessToken)
      .expect(200);
  });
  it('requires authentication for logout', async () => {
    await request(app.getHttpServer()).post('/api/auth/logout').expect(401);
  });
  it('throttles lastUsedAt writes for active session', async () => {
    await auth.authenticate(token('a'));
    await auth.authenticate(token('a'));
    expect(prisma.authSession.updateMany).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['a', '/api/admin/dashboard', 403],
    ['a', '/api/staff/attendance', 403],
    ['c', '/api/admin/dashboard', 403],
    ['d', '/api/admin/dashboard', 200],
    ['c', '/api/staff/attendance', 200],
    ['d', '/api/staff/attendance', 403],
  ])('role %s accessing %s returns %s', async (id, url, status) => {
    await request(app.getHttpServer())
      .get(url)
      .set('Authorization', header(id))
      .expect(status);
  });

  it('cannot modify another profile via legacy route or injected userId', async () => {
    await request(app.getHttpServer())
      .patch('/api/users/b/profile')
      .set('Authorization', header('a'))
      .send({ name: 'Hacked' })
      .expect(404);
    const before = { ...users.get('b') };
    await request(app.getHttpServer())
      .patch('/api/users/me')
      .set('Authorization', header('a'))
      .send({ name: 'Updated A', userId: 'b', role: 'ADMIN' })
      .expect(200);
    expect(users.get('b')).toEqual(before);
    expect(users.get('a').role).toBe(Role.CUSTOMER);
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'a' } }),
    );
  });
  it.each([
    ['get', '/api/bookings/booking-b', undefined],
    ['delete', '/api/bookings/booking-b', undefined],
    ['get', '/api/bookings/booking-b/tickets', undefined],
    ['get', '/api/bookings/booking-b/payment-status', undefined],
    ['patch', '/api/bookings/booking-b/combos', { items: [] }],
    ['post', '/api/bookings/booking-b/pay', undefined],
    ['post', '/api/bookings/booking-b/sepay', undefined],
  ])('blocks foreign booking: %s %s', async (method, url, body) => {
    // Cấu hình SePay hợp lệ để test tới bước kiểm tra ownership.
    const old = process.env;
    process.env = {
      ...old,
      SEPAY_ENABLED: 'true',
      SEPAY_BANK_ACCOUNT: '1',
      SEPAY_BANK_CODE: 'MB',
      SEPAY_ACCOUNT_NAME: 'Test',
      SEPAY_API_KEY: 'test',
    };
    try {
      await (request(app.getHttpServer()) as any)
        [method](url)
        .set('Authorization', header('a'))
        .send(body)
        .expect(403);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    } finally {
      process.env = old;
    }
  });
  it('checks promotion ownership inside transaction', async () => {
    (prisma as any).promotion = {
      findUnique: jest.fn().mockResolvedValue(null),
    };
    await request(app.getHttpServer())
      .patch('/api/bookings/booking-b/promotion')
      .set('Authorization', header('a'))
      .send({ code: 'TEST' })
      .expect(403);
    expect(prisma.$transaction).toHaveBeenCalled();
  });
  it.each(['/api/users/me/bookings', '/api/users/me/tickets', '/api/bookings'])(
    'history %s uses session identity',
    async (url) => {
      await request(app.getHttpServer())
        .get(url + '?userId=b')
        .set('Authorization', header('a'))
        .expect(200);
      const call = url.includes('tickets')
        ? prisma.ticket.findMany
        : prisma.booking.findMany;
      expect(call).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining(
            url.includes('tickets')
              ? { booking: expect.objectContaining({ userId: 'a' }) }
              : { userId: 'a' },
          ),
        }),
      );
    },
  );
  it.each(['/api/users/b/bookings', '/api/users/b/tickets'])(
    'removes unsafe legacy history %s',
    async (url) => {
      await request(app.getHttpServer())
        .get(url)
        .set('Authorization', header('a'))
        .expect(404);
    },
  );
  it('booking creation takes userId from session', async () => {
    const create = jest
      .spyOn(bookings, 'create')
      .mockResolvedValue({} as never);
    await request(app.getHttpServer())
      .post('/api/bookings')
      .set('Authorization', header('a'))
      .send({
        userId: 'b',
        showtimeId: 'showtime',
        showtimeSeatIds: ['seat'],
        guestSessionId: 'guest-hold',
      })
      .expect(201);
    expect(create).toHaveBeenCalledWith(
      {
        showtimeId: 'showtime',
        showtimeSeatIds: ['seat'],
        guestSessionId: 'guest-hold',
      },
      'a',
    );
  });
  it('review uses authenticated user and retains paid-booking requirement', async () => {
    prisma.movie.findUnique.mockResolvedValue({ id: 'movie' });
    prisma.booking.findFirst.mockResolvedValue({ id: 'paid-booking' });
    prisma.movieReview.upsert.mockResolvedValue({ id: 'review', userId: 'a' });
    prisma.movieReview.aggregate.mockResolvedValue({
      _avg: { rating: 8 },
      _count: { rating: 1 },
    });
    await request(app.getHttpServer())
      .post('/api/movies/movie/reviews')
      .set('Authorization', header('a'))
      .send({ userId: 'b', rating: 8, comment: 'Hay' })
      .expect(201);
    expect(prisma.movieReview.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId_movieId: { userId: 'a', movieId: 'movie' } },
        create: expect.objectContaining({ userId: 'a' }),
      }),
    );
    expect(prisma.booking.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: 'a', status: 'PAID' }),
      }),
    );
    prisma.booking.findFirst.mockResolvedValue(null);
    await request(app.getHttpServer())
      .post('/api/movies/movie/reviews')
      .set('Authorization', header('a'))
      .send({ rating: 8 })
      .expect(400);
  });
  it.each(['tickets/qr/token/check-in', 'bookings/qr/token/check-in'])(
    'customer cannot check in %s',
    async (url) => {
      await request(app.getHttpServer())
        .post('/api/' + url)
        .set('Authorization', header('a'))
        .send({})
        .expect(403);
    },
  );
  it.each([
    ['c', 'tickets'],
    ['d', 'tickets'],
    ['c', 'bookings'],
    ['d', 'bookings'],
  ])('%s can check in %s with session actor', async (id, resource) => {
    const method =
      resource === 'tickets' ? 'checkInTicket' : 'checkInBookingByQr';
    const checkIn = jest.spyOn(bookings, method).mockResolvedValue({} as never);
    await request(app.getHttpServer())
      .post('/api/' + resource + '/qr/token/check-in')
      .set('Authorization', header(id))
      .send({ checkedInBy: 'spoofed', notes: 'OK' })
      .expect(201);
    expect(checkIn).toHaveBeenCalledWith('token', { notes: 'OK' }, id);
  });
  it.each([
    '/api/tickets/qr/token',
    '/api/bookings/qr/token',
    '/api/admin/bookings',
  ])('customer cannot inspect other resources at %s', async (url) => {
    await request(app.getHttpServer())
      .get(url)
      .set('Authorization', header('a'))
      .expect(403);
  });
  it.each([
    ['a', 403],
    ['c', 403],
    ['d', 201],
  ] as const)(
    'expiry administration requires ADMIN: %s',
    async (id, status) => {
      const expire = jest
        .spyOn(bookings, 'expirePendingBookings')
        .mockResolvedValue({} as never);
      await request(app.getHttpServer())
        .post('/api/admin/bookings/expire')
        .set('Authorization', header(id))
        .expect(status);
      expect(expire).toHaveBeenCalledTimes(status === 201 ? 1 : 0);
    },
  );

  it('returns 404 for a missing booking after authentication', async () => {
    prisma.booking.findUnique.mockResolvedValue(null);
    await request(app.getHttpServer())
      .get('/api/bookings/missing')
      .set('Authorization', header('a'))
      .expect(404);
  });

  // Đặt cuối suite vì bộ đếm throttle theo IP dùng chung giữa các test.
  it('giới hạn tần suất đăng nhập: vượt hạn mức trả 429 kèm Retry-After', async () => {
    const attempt = () =>
      request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ identifier: 'a', password: 'sai-mat-khau' });
    let last = await attempt();
    for (let i = 0; i < 12 && last.status !== 429; i++) last = await attempt();
    expect(last.status).toBe(429);
    expect(last.headers['retry-after']).toBeDefined();
  });
});
