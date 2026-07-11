import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHmac, randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';
import type { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { SeatHoldsService } from '../seat-holds/seat-holds.service';
import { CheckInTicketDto } from './dto/check-in-ticket.dto';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingCombosDto } from './dto/update-booking-combos.dto';

const BOOKING_HOLD_MINUTES = 5;
const BOOKING_QR_PREFIX = 'CINETICKET:BOOKING:';
const ONLINE_DEMO_PROVIDERS = ['vnpay', 'card', 'momo', 'zalopay'] as const;

@Injectable()
export class BookingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly seatHoldsService: SeatHoldsService,
  ) {}

  async create(createBookingDto: CreateBookingDto) {
    const { userId, showtimeId } = createBookingDto;
    const showtimeSeatIds = [...new Set(createBookingDto.showtimeSeatIds)];

    if (showtimeSeatIds.length !== createBookingDto.showtimeSeatIds.length) {
      throw new BadRequestException('Duplicate seats are not allowed');
    }

    const [user, showtime] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true },
      }),
      this.prisma.showtime.findUnique({
        where: { id: showtimeId },
        select: { id: true },
      }),
    ]);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!showtime) {
      throw new NotFoundException('Showtime not found');
    }

    const showtimeSeats = await this.prisma.showtimeSeat.findMany({
      where: {
        id: {
          in: showtimeSeatIds,
        },
      },
      include: {
        seat: true,
      },
    });

    if (showtimeSeats.length !== showtimeSeatIds.length) {
      throw new NotFoundException('One or more seats were not found');
    }

    const wrongShowtimeSeat = showtimeSeats.find(
      (showtimeSeat) => showtimeSeat.showtimeId !== showtimeId,
    );

    if (wrongShowtimeSeat) {
      throw new BadRequestException(
        'One or more seats do not belong to this showtime',
      );
    }

    const unavailableSeat = showtimeSeats.find(
      (showtimeSeat) => showtimeSeat.status !== 'AVAILABLE',
    );

    if (unavailableSeat) {
      throw new ConflictException('One or more seats are not available');
    }

    const totalAmount = showtimeSeats.reduce(
      (sum, showtimeSeat) => sum + Number(showtimeSeat.price),
      0,
    );
    const expiresAt = new Date(
      Date.now() + BOOKING_HOLD_MINUTES * 60 * 1000,
    );

    await this.seatHoldsService.bindHoldsToUser({
      showtimeId,
      showtimeSeatIds,
      sessionId: createBookingDto.sessionId,
      userId,
    });

    const booking = await this.prisma.$transaction(async (tx) =>
      tx.booking.create({
        data: {
          userId,
          showtimeId,
          status: 'PENDING',
          totalAmount,
          currency: 'VND',
          expiresAt,
          bookingItems: {
            create: showtimeSeats.map((showtimeSeat) => ({
              showtimeSeatId: showtimeSeat.id,
              unitPrice: showtimeSeat.price,
            })),
          },
        },
        include: {
          bookingItems: {
            include: {
              showtimeSeat: {
                include: {
                  seat: true,
                },
              },
            },
            orderBy: [
              {
                showtimeSeat: {
                  seat: {
                    row: Prisma.SortOrder.asc,
                  },
                },
              },
              {
                showtimeSeat: {
                  seat: {
                    number: Prisma.SortOrder.asc,
                  },
                },
              },
            ],
          },
        },
      })
    );

    return {
      id: booking.id,
      status: booking.status,
      totalAmount: Number(booking.totalAmount),
      seatSubtotal: Number(booking.totalAmount),
      comboSubtotal: 0,
      currency: booking.currency,
      expiresAt: booking.expiresAt,
      comboItems: [],
      items: booking.bookingItems.map((bookingItem) => ({
        id: bookingItem.id,
        showtimeSeatId: bookingItem.showtimeSeatId,
        row: bookingItem.showtimeSeat.seat.row,
        number: bookingItem.showtimeSeat.seat.number,
        type: bookingItem.showtimeSeat.seat.type,
        unitPrice: Number(bookingItem.unitPrice),
      })),
    };
  }

  async updateBookingCombos(bookingId: string, dto: UpdateBookingCombosDto) {
    const items = dto.items || [];
    const normalizedItems = items.filter((item) => item.quantity > 0);
    const comboIds = normalizedItems.map((item) => item.comboId);
    const duplicateCombo = new Set(comboIds).size !== comboIds.length;
    if (duplicateCombo) {
      throw new BadRequestException('Duplicate combos are not allowed');
    }

    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        bookingItems: true,
      },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.status !== 'PENDING') {
      throw new BadRequestException('Only pending bookings can be updated');
    }

    const combos = comboIds.length
      ? await this.prisma.concessionCombo.findMany({
          where: { id: { in: comboIds }, isActive: true },
        })
      : [];
    if (combos.length !== comboIds.length) {
      throw new NotFoundException('One or more combos were not found');
    }

    const combosById = new Map(combos.map((combo) => [combo.id, combo]));
    const seatSubtotal = booking.bookingItems.reduce(
      (sum, item) => sum + Number(item.unitPrice),
      0,
    );
    const comboSubtotal = normalizedItems.reduce((sum, item) => {
      const combo = combosById.get(item.comboId);
      return sum + Number(combo?.price || 0) * item.quantity;
    }, 0);

    const updatedBooking = await this.prisma.$transaction(async (tx) => {
      await tx.bookingComboItem.deleteMany({ where: { bookingId } });
      if (normalizedItems.length) {
        await tx.bookingComboItem.createMany({
          data: normalizedItems.map((item) => {
            const combo = combosById.get(item.comboId);
            if (!combo) throw new NotFoundException('Combo not found');
            return {
              bookingId,
              comboId: item.comboId,
              quantity: item.quantity,
              unitPrice: combo.price,
            };
          }),
        });
      }

      return tx.booking.update({
        where: { id: bookingId },
        data: { totalAmount: seatSubtotal + comboSubtotal },
        include: {
          comboItems: {
            include: { combo: true },
            orderBy: { createdAt: 'asc' },
          },
        },
      });
    });

    return {
      bookingId,
      status: updatedBooking.status,
      seatSubtotal,
      comboSubtotal,
      totalAmount: Number(updatedBooking.totalAmount),
      currency: updatedBooking.currency,
      comboItems: updatedBooking.comboItems.map((item) => ({
        id: item.id,
        comboId: item.comboId,
        name: item.combo.name,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        lineTotal: Number(item.unitPrice) * item.quantity,
      })),
    };
  }

  async pay(bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        bookingItems: {
          include: {
            showtimeSeat: {
              include: {
                seat: true,
              },
            },
          },
        },
      },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.status !== 'PENDING') {
      throw new BadRequestException('Only pending bookings can be paid');
    }

    if (booking.expiresAt && booking.expiresAt < new Date()) {
      throw new BadRequestException('Booking has expired');
    }

    const unheldSeat = booking.bookingItems.find(
      (bookingItem) => bookingItem.showtimeSeat.status !== 'AVAILABLE',
    );

    if (unheldSeat) {
      throw new ConflictException('One or more seats are no longer held');
    }

    const showtimeSeatIds = booking.bookingItems.map(
      (bookingItem) => bookingItem.showtimeSeatId,
    );

    await this.seatHoldsService.verifyBookingHolds({
      userId: booking.userId,
      showtimeId: booking.showtimeId,
      showtimeSeatIds,
    });

    const paidBooking = await this.prisma.$transaction(async (tx) => {
      const updatedSeats = await tx.showtimeSeat.updateMany({
        where: {
          id: {
            in: showtimeSeatIds,
          },
          status: 'AVAILABLE',
        },
        data: {
          status: 'BOOKED',
        },
      });

      if (updatedSeats.count !== showtimeSeatIds.length) {
        throw new ConflictException('One or more seats are no longer held');
      }

      const payment = await tx.payment.create({
        data: {
          bookingId: booking.id,
          provider: 'mock',
          providerRef: randomUUID(),
          amount: booking.totalAmount,
          currency: booking.currency,
          status: 'SUCCESS',
          paidAt: new Date(),
        },
      });

      await Promise.all(
        booking.bookingItems.map((bookingItem) =>
          tx.ticket.create({
            data: {
              bookingId: booking.id,
              bookingItemId: bookingItem.id,
              qrToken: randomUUID(),
              status: 'VALID',
            },
          }),
        ),
      );

      const updatedBooking = await tx.booking.update({
        where: { id: booking.id },
        data: {
          status: 'PAID',
        },
        include: {
          tickets: {
            include: {
              bookingItem: {
                include: {
                  showtimeSeat: {
                    include: {
                      seat: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      return {
        booking: updatedBooking,
        payment,
      };
    });

    await this.seatHoldsService.releaseMany(showtimeSeatIds);

    return {
      bookingId: paidBooking.booking.id,
      status: paidBooking.booking.status,
      payment: {
        id: paidBooking.payment.id,
        status: paidBooking.payment.status,
        amount: Number(paidBooking.payment.amount),
        currency: paidBooking.payment.currency,
        provider: paidBooking.payment.provider,
        providerRef: paidBooking.payment.providerRef,
        paidAt: paidBooking.payment.paidAt,
      },
      tickets: paidBooking.booking.tickets.map((ticket) => ({
        id: ticket.id,
        qrToken: ticket.qrToken,
        status: ticket.status,
        seat: {
          row: ticket.bookingItem.showtimeSeat.seat.row,
          number: ticket.bookingItem.showtimeSeat.seat.number,
          type: ticket.bookingItem.showtimeSeat.seat.type,
        },
      })),
    };
  }

  async findUserTickets(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const tickets = await this.prisma.ticket.findMany({
      where: {
        booking: {
          userId,
          status: 'PAID',
        },
      },
      include: {
        booking: {
          include: {
            showtime: {
              include: {
                movie: true,
                room: {
                  include: {
                    cinema: true,
                  },
                },
              },
            },
          },
        },
        bookingItem: {
          include: {
            showtimeSeat: {
              include: {
                seat: true,
              },
            },
          },
        },
      },
      orderBy: {
        issuedAt: 'desc',
      },
    });

    return {
      userId,
      tickets: tickets.map((ticket) => ({
        id: ticket.id,
        qrToken: ticket.qrToken,
        status: ticket.status,
        issuedAt: ticket.issuedAt,
        expiresAt: ticket.expiresAt,
        movie: {
          id: ticket.booking.showtime.movie.id,
          title: ticket.booking.showtime.movie.title,
        },
        showtime: {
          id: ticket.booking.showtime.id,
          startAt: ticket.booking.showtime.startAt,
          endAt: ticket.booking.showtime.endAt,
        },
        cinema: {
          id: ticket.booking.showtime.room.cinema.id,
          name: ticket.booking.showtime.room.cinema.name,
        },
        room: {
          id: ticket.booking.showtime.room.id,
          name: ticket.booking.showtime.room.name,
        },
        seat: {
          row: ticket.bookingItem.showtimeSeat.seat.row,
          number: ticket.bookingItem.showtimeSeat.seat.number,
          type: ticket.bookingItem.showtimeSeat.seat.type,
        },
        booking: {
          id: ticket.booking.id,
          status: ticket.booking.status,
          totalAmount: Number(ticket.booking.totalAmount),
          currency: ticket.booking.currency,
          qrToken: this.bookingQrToken(ticket.booking.id),
        },
      })),
    };
  }

  async findAll() {
    const bookings = await this.prisma.booking.findMany({
      include: {
        user: true,
        showtime: {
          include: {
            movie: true,
            room: {
              include: {
                cinema: true,
              },
            },
          },
        },
        bookingItems: {
          include: {
            showtimeSeat: {
              include: {
                seat: true,
              },
            },
          },
          orderBy: [
            {
              showtimeSeat: {
                seat: {
                  row: 'asc',
                },
              },
            },
            {
              showtimeSeat: {
                seat: {
                  number: 'asc',
                },
              },
            },
          ],
        },
        comboItems: {
          include: {
            combo: true,
          },
        },
        payments: {
          orderBy: { createdAt: 'desc' },
        },
        tickets: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 100,
    });

    return { bookings: bookings.map((booking) => this.mapBookingDetail(booking)) };
  }

  async findOne(bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: this.bookingDetailInclude(),
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    return this.mapBookingDetail(booking);
  }

  async cancel(bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        bookingItems: true,
      },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.status !== 'PENDING') {
      throw new BadRequestException('Only pending bookings can be cancelled');
    }

    const showtimeSeatIds = booking.bookingItems.map(
      (bookingItem) => bookingItem.showtimeSeatId,
    );

    const cancelledBooking = await this.prisma.$transaction(async (tx) =>
      tx.booking.update({
        where: { id: booking.id },
        data: {
          status: 'CANCELLED',
          expiresAt: null,
        },
      }),
    );

    await this.seatHoldsService.releaseMany(showtimeSeatIds);

    return {
      bookingId: cancelledBooking.id,
      status: cancelledBooking.status,
      releasedSeatCount: showtimeSeatIds.length,
    };
  }

  async findTicketByQr(qrToken: string) {
    const ticket = await this.findTicketRecordByQr(qrToken);
    return {
      ticket: this.mapTicketDetail(ticket),
    };
  }

  async createVnpayPayment(bookingId: string, request: Request) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        bookingItems: {
          include: {
            showtimeSeat: true,
          },
        },
      },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.status !== 'PENDING') {
      throw new BadRequestException('Only pending bookings can be paid');
    }

    if (booking.expiresAt && booking.expiresAt < new Date()) {
      throw new BadRequestException('Booking has expired');
    }

    const unheldSeat = booking.bookingItems.find(
      (bookingItem) => bookingItem.showtimeSeat.status !== 'AVAILABLE',
    );

    if (unheldSeat) {
      throw new ConflictException('One or more seats are no longer held');
    }

    await this.seatHoldsService.verifyBookingHolds({
      userId: booking.userId,
      showtimeId: booking.showtimeId,
      showtimeSeatIds: booking.bookingItems.map((item) => item.showtimeSeatId),
    });

    if (this.isVnpayDemoMode()) {
      return this.createVnpayDemoPayment(booking, request);
    }

    const config = this.getVnpayConfig();
    const payment = await this.prisma.payment.create({
      data: {
        bookingId: booking.id,
        provider: 'vnpay',
        providerRef: randomUUID(),
        amount: booking.totalAmount,
        currency: booking.currency,
        status: 'PENDING',
      },
    });

    const now = new Date();
    const expire = new Date(now.getTime() + 10 * 60 * 1000);
    const params: Record<string, string> = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: config.tmnCode,
      vnp_Amount: String(Math.round(Number(booking.totalAmount) * 100)),
      vnp_CurrCode: 'VND',
      vnp_TxnRef: payment.providerRef || payment.id,
      vnp_OrderInfo: `Thanh toan booking ${booking.id}`,
      vnp_OrderType: 'billpayment',
      vnp_Locale: 'vn',
      vnp_ReturnUrl: config.returnUrl,
      vnp_IpAddr: this.getClientIp(request),
      vnp_CreateDate: this.formatVnpayDate(now),
      vnp_ExpireDate: this.formatVnpayDate(expire),
    };

    const secureHash = this.signVnpayParams(params, config.hashSecret);
    const query = this.toVnpayQueryString({
      ...params,
      vnp_SecureHash: secureHash,
    });

    return {
      bookingId: booking.id,
      paymentId: payment.id,
      providerRef: payment.providerRef,
      paymentUrl: `${config.paymentUrl}?${query}`,
    };
  }

  async onlineDemoPay(bookingId: string, provider = 'vnpay') {
    if (!ONLINE_DEMO_PROVIDERS.includes(provider as any)) {
      throw new BadRequestException('Unsupported online payment provider');
    }

    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        bookingItems: {
          include: {
            showtimeSeat: {
              include: {
                seat: true,
              },
            },
          },
        },
        tickets: true,
      },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.status !== 'PENDING') {
      throw new BadRequestException('Only pending bookings can be paid');
    }

    if (booking.expiresAt && booking.expiresAt < new Date()) {
      throw new BadRequestException('Booking has expired');
    }

    const unheldSeat = booking.bookingItems.find(
      (bookingItem) => bookingItem.showtimeSeat.status !== 'AVAILABLE',
    );

    if (unheldSeat) {
      throw new ConflictException('One or more seats are no longer held');
    }

    await this.seatHoldsService.verifyBookingHolds({
      userId: booking.userId,
      showtimeId: booking.showtimeId,
      showtimeSeatIds: booking.bookingItems.map((item) => item.showtimeSeatId),
    });

    const payment = await this.prisma.payment.create({
      data: {
        bookingId: booking.id,
        provider: `${provider}-demo`,
        providerRef: randomUUID(),
        amount: booking.totalAmount,
        currency: booking.currency,
        status: 'PENDING',
      },
      include: {
        booking: {
          include: {
            bookingItems: {
              include: {
                showtimeSeat: {
                  include: {
                    seat: true,
                  },
                },
              },
            },
            tickets: true,
          },
        },
      },
    });

    await this.confirmPaidBookingPayment(payment, payment.providerRef || undefined);

    return {
      bookingId: booking.id,
      status: 'PAID',
      payment: {
        id: payment.id,
        status: 'SUCCESS',
        amount: Number(payment.amount),
        currency: payment.currency,
        provider: payment.provider,
        providerRef: payment.providerRef,
        paidAt: new Date(),
      },
    };
  }

  async handleVnpayReturn(query: Record<string, string>) {
    const config = this.getVnpayConfig();
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const secureHash = query.vnp_SecureHash;
    const signedParams = { ...query };
    delete signedParams.vnp_SecureHash;
    delete signedParams.vnp_SecureHashType;

    const expectedHash = this.signVnpayParams(signedParams, config.hashSecret);
    const providerRef = query.vnp_TxnRef;

    if (!secureHash || secureHash.toLowerCase() !== expectedHash.toLowerCase()) {
      return `${frontendUrl}/#/payment?payment=invalid-signature`;
    }

    const payment = await this.prisma.payment.findFirst({
      where: {
        provider: 'vnpay',
        providerRef,
      },
      include: {
        booking: {
          include: {
            bookingItems: {
              include: {
                showtimeSeat: {
                  include: {
                    seat: true,
                  },
                },
              },
            },
            tickets: true,
          },
        },
      },
    });

    if (!payment) {
      return `${frontendUrl}/#/payment?payment=not-found`;
    }

    const expectedAmount = String(Math.round(Number(payment.amount) * 100));
    if (query.vnp_Amount !== expectedAmount) {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'FAILED' },
      });
      return `${frontendUrl}/#/payment?payment=amount-mismatch&bookingId=${payment.bookingId}`;
    }

    const success =
      query.vnp_ResponseCode === '00' && query.vnp_TransactionStatus === '00';

    if (!success) {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'FAILED',
          providerRef: providerRef || payment.providerRef,
        },
      });
      return `${frontendUrl}/#/payment?payment=failed&bookingId=${payment.bookingId}`;
    }

    if (payment.booking.status === 'PAID') {
      return `${frontendUrl}/#/ticket/${payment.bookingId}?payment=success`;
    }

    if (payment.booking.status !== 'PENDING') {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'FAILED' },
      });
      return `${frontendUrl}/#/payment?payment=failed&bookingId=${payment.bookingId}`;
    }

    if (payment.booking.expiresAt && payment.booking.expiresAt < new Date()) {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'FAILED' },
      });
      return `${frontendUrl}/#/payment?payment=expired&bookingId=${payment.bookingId}`;
    }

    await this.confirmPaidBookingPayment(payment, providerRef);

    return `${frontendUrl}/#/ticket/${payment.bookingId}?payment=success`;
  }

  async handleVnpayDemoReturn(providerRef: string) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    if (!this.isVnpayDemoMode()) {
      return `${frontendUrl}/#/payment?payment=demo-disabled`;
    }

    const payment = await this.prisma.payment.findFirst({
      where: {
        provider: 'vnpay-demo',
        providerRef,
      },
      include: {
        booking: {
          include: {
            bookingItems: {
              include: {
                showtimeSeat: {
                  include: {
                    seat: true,
                  },
                },
              },
            },
            tickets: true,
          },
        },
      },
    });

    if (!payment) {
      return `${frontendUrl}/#/payment?payment=not-found`;
    }

    if (payment.booking.status === 'PAID') {
      return `${frontendUrl}/#/ticket/${payment.bookingId}?payment=success`;
    }

    if (payment.booking.status !== 'PENDING') {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'FAILED' },
      });
      return `${frontendUrl}/#/payment?payment=failed&bookingId=${payment.bookingId}`;
    }

    if (payment.booking.expiresAt && payment.booking.expiresAt < new Date()) {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'FAILED' },
      });
      return `${frontendUrl}/#/payment?payment=expired&bookingId=${payment.bookingId}`;
    }

    await this.confirmPaidBookingPayment(payment, providerRef);
    return `${frontendUrl}/#/ticket/${payment.bookingId}?payment=success&mode=demo`;
  }

  async findBookingTickets(bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      select: { id: true },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    const tickets = await this.prisma.ticket.findMany({
      where: { bookingId },
      include: this.ticketDetailInclude(),
      orderBy: {
        issuedAt: 'asc',
      },
    });

    return {
      bookingId,
      bookingQrToken: this.bookingQrToken(bookingId),
      tickets: tickets.map((ticket) => this.mapTicketDetail(ticket)),
    };
  }

  async findBookingByQr(bookingQrToken: string) {
    const bookingId = this.parseBookingQrToken(bookingQrToken);
    return this.findBookingTickets(bookingId);
  }

  async checkInBookingByQr(
    bookingQrToken: string,
    checkInTicketDto: CheckInTicketDto,
  ) {
    const bookingId = this.parseBookingQrToken(bookingQrToken);
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        tickets: {
          include: {
            checkIn: true,
          },
        },
      },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.status !== 'PAID') {
      throw new BadRequestException('Only paid bookings can be checked in');
    }

    const validTicketIds = booking.tickets
      .filter((ticket) => ticket.status === 'VALID' && !ticket.checkIn)
      .map((ticket) => ticket.id);

    if (validTicketIds.length === 0) {
      throw new BadRequestException('No valid tickets can be checked in');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.ticket.updateMany({
        where: {
          id: {
            in: validTicketIds,
          },
          status: 'VALID',
        },
        data: {
          status: 'USED',
        },
      });

      await tx.ticketCheckIn.createMany({
        data: validTicketIds.map((ticketId) => ({
          ticketId,
          checkedInBy: checkInTicketDto.checkedInBy,
          notes: checkInTicketDto.notes,
        })),
        skipDuplicates: true,
      });
    });

    const detail = await this.findBookingTickets(bookingId);
    return {
      ...detail,
      checkedInTicketCount: validTicketIds.length,
    };
  }

  async checkInTicket(qrToken: string, checkInTicketDto: CheckInTicketDto) {
    const ticket = await this.findTicketRecordByQr(qrToken);

    if (ticket.status !== 'VALID') {
      throw new BadRequestException('Only valid tickets can be checked in');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const updatedTicket = await tx.ticket.update({
        where: { id: ticket.id },
        data: {
          status: 'USED',
          checkIn: {
            create: {
              checkedInBy: checkInTicketDto.checkedInBy,
              notes: checkInTicketDto.notes,
            },
          },
        },
        include: this.ticketDetailInclude(),
      });

      return updatedTicket;
    });

    return {
      ticket: this.mapTicketDetail(result),
    };
  }

  async expirePendingBookings() {
    const expiredBookings = await this.prisma.booking.findMany({
      where: {
        status: 'PENDING',
        expiresAt: {
          lt: new Date(),
        },
      },
      include: {
        bookingItems: true,
      },
    });

    if (expiredBookings.length === 0) {
      return {
        expiredBookingCount: 0,
        releasedSeatCount: 0,
      };
    }

    const expiredBookingIds = expiredBookings.map((booking) => booking.id);
    const showtimeSeatIds = expiredBookings.flatMap((booking) =>
      booking.bookingItems.map((bookingItem) => bookingItem.showtimeSeatId),
    );

    const result = await this.prisma.$transaction(async (tx) => {
      const updatedBookings = await tx.booking.updateMany({
        where: {
          id: {
            in: expiredBookingIds,
          },
          status: 'PENDING',
        },
        data: {
          status: 'EXPIRED',
        },
      });

      return {
        expiredBookingCount: updatedBookings.count,
        releasedSeatCount: showtimeSeatIds.length,
      };
    });

    await this.seatHoldsService.releaseMany(showtimeSeatIds);

    return result;
  }

  private async findTicketRecordByQr(qrToken: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { qrToken },
      include: this.ticketDetailInclude(),
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    return ticket;
  }

  private ticketDetailInclude() {
    return {
      checkIn: true,
      booking: {
        include: {
          comboItems: {
            include: {
              combo: true,
            },
          },
          user: true,
          showtime: {
            include: {
              movie: true,
              room: {
                include: {
                  cinema: true,
                },
              },
            },
          },
        },
      },
      bookingItem: {
        include: {
          showtimeSeat: {
            include: {
              seat: true,
            },
          },
        },
      },
    };
  }

  private bookingDetailInclude() {
    return {
      user: true,
      showtime: {
        include: {
          movie: true,
          room: {
            include: {
              cinema: true,
            },
          },
        },
      },
      bookingItems: {
        include: {
          showtimeSeat: {
            include: {
              seat: true,
            },
          },
        },
        orderBy: [
          { showtimeSeat: { seat: { row: Prisma.SortOrder.asc } } },
          { showtimeSeat: { seat: { number: Prisma.SortOrder.asc } } },
        ],
      },
      comboItems: {
        include: {
          combo: true,
        },
      },
      payments: {
        orderBy: { createdAt: Prisma.SortOrder.desc },
      },
      tickets: {
        include: {
          bookingItem: {
            include: {
              showtimeSeat: {
                include: {
                  seat: true,
                },
              },
            },
          },
          checkIn: true,
        },
        orderBy: { issuedAt: Prisma.SortOrder.asc },
      },
    };
  }

  private mapBookingDetail(booking: any) {
    const seats = booking.bookingItems.map((bookingItem) => ({
      id: `${bookingItem.showtimeSeat.seat.row}${bookingItem.showtimeSeat.seat.number}`,
      row: bookingItem.showtimeSeat.seat.row,
      number: bookingItem.showtimeSeat.seat.number,
      type: bookingItem.showtimeSeat.seat.type,
      unitPrice: Number(bookingItem.unitPrice),
    }));
    const comboItems = (booking.comboItems || []).map((item) => ({
      id: item.id,
      comboId: item.comboId,
      name: item.combo?.name,
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice),
      lineTotal: Number(item.unitPrice) * item.quantity,
    }));
    const payments = (booking.payments || []).map((payment) => ({
      id: payment.id,
      provider: payment.provider,
      providerRef: payment.providerRef,
      amount: Number(payment.amount),
      currency: payment.currency,
      status: payment.status,
      paidAt: payment.paidAt,
      createdAt: payment.createdAt,
    }));
    const tickets = (booking.tickets || []).map((ticket) => ({
      id: ticket.id,
      qrToken: ticket.qrToken,
      status: ticket.status,
      issuedAt: ticket.issuedAt,
      checkedInAt: ticket.checkIn?.checkedInAt || null,
      seat: ticket.bookingItem
        ? {
            id: `${ticket.bookingItem.showtimeSeat.seat.row}${ticket.bookingItem.showtimeSeat.seat.number}`,
            row: ticket.bookingItem.showtimeSeat.seat.row,
            number: ticket.bookingItem.showtimeSeat.seat.number,
            type: ticket.bookingItem.showtimeSeat.seat.type,
          }
        : null,
    }));

    return {
      id: booking.id,
      status: booking.status,
      totalAmount: Number(booking.totalAmount),
      currency: booking.currency,
      expiresAt: booking.expiresAt,
      createdAt: booking.createdAt,
      updatedAt: booking.updatedAt,
      user: {
        id: booking.user.id,
        email: booking.user.email,
        name:
          [booking.user.firstName, booking.user.lastName].filter(Boolean).join(' ') ||
          booking.user.email,
      },
      movie: {
        id: booking.showtime.movie.id,
        title: booking.showtime.movie.title,
      },
      showtime: {
        id: booking.showtime.id,
        startAt: booking.showtime.startAt,
        endAt: booking.showtime.endAt,
      },
      cinema: {
        id: booking.showtime.room.cinema.id,
        name: booking.showtime.room.cinema.name,
        address: booking.showtime.room.cinema.address,
      },
      room: {
        id: booking.showtime.room.id,
        name: booking.showtime.room.name,
      },
      seats,
      comboItems,
      payments,
      tickets,
      ticketCount: tickets.length,
      bookingQrToken: this.bookingQrToken(booking.id),
    };
  }

  private mapTicketDetail(ticket: any) {
    return {
      id: ticket.id,
      qrToken: ticket.qrToken,
      status: ticket.status,
      issuedAt: ticket.issuedAt,
      expiresAt: ticket.expiresAt,
      checkedInAt: ticket.checkIn?.checkedInAt || null,
      checkedInBy: ticket.checkIn?.checkedInBy || null,
      movie: {
        id: ticket.booking.showtime.movie.id,
        title: ticket.booking.showtime.movie.title,
      },
      user: {
        id: ticket.booking.user.id,
        email: ticket.booking.user.email,
        name: [ticket.booking.user.firstName, ticket.booking.user.lastName]
          .filter(Boolean)
          .join(' ') || ticket.booking.user.email,
      },
      showtime: {
        id: ticket.booking.showtime.id,
        startAt: ticket.booking.showtime.startAt,
        endAt: ticket.booking.showtime.endAt,
      },
      cinema: {
        id: ticket.booking.showtime.room.cinema.id,
        name: ticket.booking.showtime.room.cinema.name,
      },
      room: {
        id: ticket.booking.showtime.room.id,
        name: ticket.booking.showtime.room.name,
      },
      seat: {
        row: ticket.bookingItem.showtimeSeat.seat.row,
        number: ticket.bookingItem.showtimeSeat.seat.number,
        type: ticket.bookingItem.showtimeSeat.seat.type,
      },
      booking: {
        id: ticket.booking.id,
        status: ticket.booking.status,
        totalAmount: Number(ticket.booking.totalAmount),
        currency: ticket.booking.currency,
        qrToken: this.bookingQrToken(ticket.booking.id),
        comboItems: (ticket.booking.comboItems || []).map((item) => ({
          id: item.id,
          comboId: item.comboId,
          name: item.combo?.name,
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice),
          lineTotal: Number(item.unitPrice) * item.quantity,
        })),
      },
    };
  }

  private bookingQrToken(bookingId: string) {
    return `${BOOKING_QR_PREFIX}${bookingId}`;
  }

  private parseBookingQrToken(bookingQrToken: string) {
    const decoded = decodeURIComponent(bookingQrToken || '');
    if (!decoded.startsWith(BOOKING_QR_PREFIX)) {
      throw new BadRequestException('Invalid booking QR token');
    }

    const bookingId = decoded.slice(BOOKING_QR_PREFIX.length);
    if (!bookingId) {
      throw new BadRequestException('Invalid booking QR token');
    }

    return bookingId;
  }

  private getVnpayConfig() {
    const tmnCode = process.env.VNPAY_TMN_CODE;
    const hashSecret = process.env.VNPAY_HASH_SECRET;
    const paymentUrl =
      process.env.VNPAY_PAYMENT_URL ||
      'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
    const returnUrl =
      process.env.VNPAY_RETURN_URL ||
      'http://localhost:3000/api/bookings/vnpay-return';

    if (!tmnCode || !hashSecret) {
      throw new BadRequestException('VNPay sandbox configuration is missing');
    }

    return {
      tmnCode,
      hashSecret,
      paymentUrl,
      returnUrl,
    };
  }

  private isVnpayDemoMode() {
    return process.env.VNPAY_DEMO_MODE === 'true';
  }

  private async createVnpayDemoPayment(booking: any, request: Request) {
    const payment = await this.prisma.payment.create({
      data: {
        bookingId: booking.id,
        provider: 'vnpay-demo',
        providerRef: randomUUID(),
        amount: booking.totalAmount,
        currency: booking.currency,
        status: 'PENDING',
      },
    });

    const backendUrl = this.getBackendPublicUrl(request);

    return {
      bookingId: booking.id,
      paymentId: payment.id,
      providerRef: payment.providerRef,
      demoMode: true,
      paymentUrl: `${backendUrl}/api/bookings/vnpay-demo-return?ref=${encodeURIComponent(
        payment.providerRef || payment.id,
      )}`,
    };
  }

  private getBackendPublicUrl(request: Request) {
    const forwardedProto = request.headers['x-forwarded-proto'];
    const proto =
      typeof forwardedProto === 'string'
        ? forwardedProto.split(',')[0].trim()
        : request.protocol || 'http';
    const host = request.headers.host || 'localhost:3000';
    return `${proto}://${host}`;
  }

  private async confirmPaidBookingPayment(payment: any, providerRef?: string) {
    const showtimeSeatIds = payment.booking.bookingItems.map(
      (bookingItem) => bookingItem.showtimeSeatId,
    );

    await this.seatHoldsService.verifyBookingHolds({
      userId: payment.booking.userId,
      showtimeId: payment.booking.showtimeId,
      showtimeSeatIds,
    });

    await this.prisma.$transaction(async (tx) => {
      const updatedSeats = await tx.showtimeSeat.updateMany({
        where: {
          id: {
            in: showtimeSeatIds,
          },
          status: 'AVAILABLE',
        },
        data: {
          status: 'BOOKED',
        },
      });

      if (updatedSeats.count !== showtimeSeatIds.length) {
        throw new ConflictException('One or more seats are no longer held');
      }

      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: 'SUCCESS',
          providerRef: providerRef || payment.providerRef,
          paidAt: new Date(),
        },
      });

      await tx.booking.update({
        where: { id: payment.bookingId },
        data: {
          status: 'PAID',
        },
      });

      const existingTicketItemIds = new Set(
        payment.booking.tickets.map((ticket) => ticket.bookingItemId),
      );

      await Promise.all(
        payment.booking.bookingItems
          .filter((bookingItem) => !existingTicketItemIds.has(bookingItem.id))
          .map((bookingItem) =>
            tx.ticket.create({
              data: {
                bookingId: payment.bookingId,
                bookingItemId: bookingItem.id,
                qrToken: randomUUID(),
                status: 'VALID',
              },
            }),
          ),
      );
    });

    await this.seatHoldsService.releaseMany(showtimeSeatIds);
  }

  private getClientIp(request: Request) {
    const forwardedFor = request.headers['x-forwarded-for'];
    if (typeof forwardedFor === 'string') {
      return forwardedFor.split(',')[0].trim();
    }
    return request.ip || request.socket.remoteAddress || '127.0.0.1';
  }

  private formatVnpayDate(date: Date) {
    const pad = (value: number) => String(value).padStart(2, '0');
    return [
      date.getFullYear(),
      pad(date.getMonth() + 1),
      pad(date.getDate()),
      pad(date.getHours()),
      pad(date.getMinutes()),
      pad(date.getSeconds()),
    ].join('');
  }

  private signVnpayParams(params: Record<string, string>, hashSecret: string) {
    const signData = this.toVnpayQueryString(params);
    return createHmac('sha512', hashSecret).update(signData).digest('hex');
  }

  private toVnpayQueryString(params: Record<string, string>) {
    return Object.keys(params)
      .filter((key) => params[key] !== undefined && params[key] !== null)
      .sort()
      .map((key) => `${key}=${encodeURIComponent(params[key]).replace(/%20/g, '+')}`)
      .join('&');
  }
}
