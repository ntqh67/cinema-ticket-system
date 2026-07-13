/**
 * Mục đích: Kiểm thử các hành vi và ràng buộc quan trọng của miền đặt vé, thanh toán và vé điện tử.
 */
import { BadRequestException } from '@nestjs/common';
import { BookingsService } from './bookings.service';

describe('BookingsService seat selection rules', () => {
  const findMany = jest.fn();
  const listByShowtime = jest.fn();
  const service = new BookingsService(
    { showtimeSeat: { findMany } } as any,
    { listByShowtime } as any,
  );

  const rowSeats = [1, 2, 3].map((position) => ({
    id: `ss-${position}`,
    status: 'AVAILABLE',
    seat: {
      row: 'A',
      number: position,
      position,
      type: 'STANDARD',
    },
  }));

  // Thực hiện trách nhiệm riêng của khối beforeEach.
  beforeEach(() => {
    jest.clearAllMocks();
    findMany.mockResolvedValue(rowSeats);
  });

  // Thực hiện trách nhiệm riêng của khối it.
  it('rejects an isolated standard seat between selected seats', async () => {
    listByShowtime.mockResolvedValue([
      { showtimeSeatId: 'ss-1' },
      { showtimeSeatId: 'ss-3' },
    ]);

    await expect(
      (service as any).validateNoOrphanStandardSeat('showtime-1', [
        rowSeats[0],
        rowSeats[2],
      ]),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  // Thực hiện trách nhiệm riêng của khối it.
  it('allows the outermost standard seat to remain available', async () => {
    listByShowtime.mockResolvedValue([
      { showtimeSeatId: 'ss-2' },
      { showtimeSeatId: 'ss-3' },
    ]);

    await expect(
      (service as any).validateNoOrphanStandardSeat('showtime-1', [
        rowSeats[1],
        rowSeats[2],
      ]),
    ).resolves.toBeUndefined();
  });

  // Thực hiện trách nhiệm riêng của khối it.
  it('does not apply the standard-seat gap rule to Sweetbox', async () => {
    await expect(
      (service as any).validateNoOrphanStandardSeat('showtime-1', [
        { ...rowSeats[0], seat: { ...rowSeats[0].seat, type: 'COUPLE' } },
      ]),
    ).resolves.toBeUndefined();
    expect(findMany).not.toHaveBeenCalled();
  });
});

describe('BookingsService SePay payment flow', () => {
  const oldEnv = process.env;

  const createService = () => {
    const prisma = {
      booking: { findUnique: jest.fn() },
      payment: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      paymentWebhookEvent: {
        create: jest.fn(),
        update: jest.fn(),
      },
    };
    const seatHolds = {
      verifyBookingHolds: jest.fn(),
    };
    const service = new BookingsService(prisma as any, seatHolds as any);
    return { service, prisma, seatHolds };
  };

  const pendingBooking = {
    id: 'booking-abc123456789',
    userId: 'user-1',
    showtimeId: 'showtime-1',
    status: 'PENDING',
    totalAmount: 120000,
    currency: 'VND',
    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    bookingItems: [
      { id: 'item-1', showtimeSeatId: 'ss-1', showtimeSeat: { id: 'ss-1' } },
    ],
    tickets: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...oldEnv,
      SEPAY_ENABLED: 'true',
      SEPAY_BANK_ACCOUNT: '123456789',
      SEPAY_BANK_CODE: 'MBBANK',
      SEPAY_ACCOUNT_NAME: 'CR TICKET',
      SEPAY_API_KEY: 'test-key',
      SEPAY_PAYMENT_PREFIX: 'CRT',
    };
  });

  afterAll(() => {
    process.env = oldEnv;
  });

  it('creates a SePay payment from database booking amount', async () => {
    const { service, prisma, seatHolds } = createService();
    prisma.booking.findUnique.mockResolvedValue(pendingBooking);
    prisma.payment.findFirst.mockResolvedValue(null);
    prisma.payment.create.mockResolvedValue({
      id: 'payment-1',
      providerRef: 'CRTABC123456789',
      amount: 120000,
      currency: 'VND',
      status: 'PENDING',
      expiredAt: pendingBooking.expiresAt,
    });

    const result = await service.createSepayPayment(pendingBooking.id);

    expect(seatHolds.verifyBookingHolds).toHaveBeenCalledWith({
      userId: pendingBooking.userId,
      showtimeId: pendingBooking.showtimeId,
      showtimeSeatIds: ['ss-1'],
    });
    expect(prisma.payment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          provider: 'sepay',
          amount: pendingBooking.totalAmount,
          status: 'PENDING',
          expiredAt: pendingBooking.expiresAt,
        }),
      }),
    );
    expect(result).toMatchObject({
      paymentId: 'payment-1',
      amount: 120000,
      currency: 'VND',
      bankAccount: '123456789',
      bankCode: 'MBBANK',
      transferContent: 'CRTABC123456789',
    });
  });

  it('reuses an active pending SePay payment', async () => {
    const { service, prisma } = createService();
    prisma.booking.findUnique.mockResolvedValue(pendingBooking);
    prisma.payment.findFirst.mockResolvedValue({
      id: 'payment-old',
      providerRef: 'CRTOLD',
      amount: 120000,
      currency: 'VND',
      status: 'PENDING',
      expiredAt: pendingBooking.expiresAt,
    });

    const result = await service.createSepayPayment(pendingBooking.id);

    expect(prisma.payment.create).not.toHaveBeenCalled();
    expect(result.paymentId).toBe('payment-old');
    expect(result.transferContent).toBe('CRTOLD');
  });

  it('rejects SePay webhook with an invalid API key', async () => {
    const { service } = createService();

    await expect(
      service.handleSepayWebhook('Apikey wrong-key', {}),
    ).rejects.toThrow('Invalid SePay webhook API key');
  });

  it('marks payment as review required when SePay amount is mismatched', async () => {
    const { service, prisma } = createService();
    prisma.paymentWebhookEvent.create.mockResolvedValue({ id: 'event-1' });
    prisma.payment.findUnique.mockResolvedValue(null);
    prisma.payment.findFirst.mockResolvedValue({
      id: 'payment-1',
      bookingId: pendingBooking.id,
      providerRef: 'CRTABC123456789',
      amount: 120000,
      status: 'PENDING',
      booking: pendingBooking,
    });
    prisma.payment.update.mockResolvedValue({});
    prisma.paymentWebhookEvent.update.mockResolvedValue({});

    const result = await service.handleSepayWebhook('Apikey test-key', {
      id: 'txn-1',
      transferType: 'in',
      transferAmount: 100000,
      content: 'Thanh toan CRTABC123456789',
    });

    expect(result).toMatchObject({
      success: true,
      reviewRequired: true,
      reason: 'AMOUNT_MISMATCH',
    });
    expect(prisma.payment.update).toHaveBeenCalledWith({
      where: { id: 'payment-1' },
      data: {
        status: 'REVIEW_REQUIRED',
        providerTransactionId: 'txn-1',
      },
    });
  });

  it('confirms booking when SePay webhook is valid', async () => {
    const { service, prisma } = createService();
    const payment = {
      id: 'payment-1',
      bookingId: pendingBooking.id,
      providerRef: 'CRTABC123456789',
      amount: 120000,
      status: 'PENDING',
      booking: pendingBooking,
    };
    prisma.paymentWebhookEvent.create.mockResolvedValue({ id: 'event-1' });
    prisma.payment.findUnique.mockResolvedValue(null);
    prisma.payment.findFirst.mockResolvedValue(payment);
    prisma.paymentWebhookEvent.update.mockResolvedValue({});
    jest
      .spyOn(service as any, 'confirmPaidBookingPayment')
      .mockResolvedValue(undefined);

    const result = await service.handleSepayWebhook('Apikey test-key', {
      id: 'txn-2',
      transferType: 'in',
      transferAmount: 120000,
      content: 'Thanh toan CRTABC123456789',
    });

    expect(result).toEqual({ success: true, bookingId: pendingBooking.id });
    expect((service as any).confirmPaidBookingPayment).toHaveBeenCalledWith(
      payment,
      'CRTABC123456789',
      'txn-2',
    );
  });
});

describe('BookingsService direct Admin ticket issuing', () => {
  it('rejects direct payment for a non-zero customer booking', async () => {
    const prisma = {
      booking: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'booking-customer',
          status: 'PENDING',
          totalAmount: 120000,
          user: { role: 'CUSTOMER' },
          payments: [],
          tickets: [],
          bookingItems: [],
        }),
      },
    };
    const service = new BookingsService(prisma as any, {} as any);

    await expect(service.pay('booking-customer')).rejects.toThrow(
      'Direct ticket issuing is only available for Admin bookings with a 0 VND total',
    );
  });
});
