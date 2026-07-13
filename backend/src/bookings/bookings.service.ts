/**
 * Mục đích: Cài đặt nghiệp vụ đặt vé, thanh toán và vé điện tử; dữ liệu bền vững được truy cập qua Prisma.
 */
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { createHmac, randomUUID } from 'crypto';
import type { Request } from 'express';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SeatHoldsService } from '../seat-holds/seat-holds.service';
import { CheckInTicketDto } from './dto/check-in-ticket.dto';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingCombosDto } from './dto/update-booking-combos.dto';
import {
  ONLINE_DEMO_PAYMENT_PROVIDERS,
  type OnlineDemoPaymentProvider,
} from './dto/online-demo-payment.dto';

const DEFAULT_BOOKING_HOLD_MINUTES = 10;
const SEPAY_PROVIDER = 'sepay';
const DEFAULT_SEPAY_PAYMENT_PREFIX = 'CRT';
const BOOKING_QR_PREFIX = 'CINETICKET:BOOKING:';
// Đối tượng PAYMENT_WITH_BOOKING_INCLUDE gom các hành vi có cùng trách nhiệm để các phần khác tái sử dụng.
const PAYMENT_WITH_BOOKING_INCLUDE = {
  booking: {
    include: {
      bookingItems: {
        include: { showtimeSeat: { include: { seat: true } } },
      },
      tickets: true,
    },
  },
} satisfies Prisma.PaymentInclude;

// Đối tượng TICKET_DETAIL_INCLUDE gom các hành vi có cùng trách nhiệm để các phần khác tái sử dụng.
const TICKET_DETAIL_INCLUDE = {
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
        include: { movie: true, room: { include: { cinema: true } } },
      },
    },
  },
  bookingItem: {
    include: { showtimeSeat: { include: { seat: true } } },
  },
} satisfies Prisma.TicketInclude;

type PaymentWithBooking = Prisma.PaymentGetPayload<{
  include: typeof PAYMENT_WITH_BOOKING_INCLUDE;
}>;
type TicketDetail = Prisma.TicketGetPayload<{
  include: typeof TICKET_DETAIL_INCLUDE;
}>;
type PaymentBooking = Pick<
  Prisma.BookingGetPayload<Record<string, never>>,
  'id' | 'totalAmount' | 'currency'
>;

type SepayConfig = {
  enabled: boolean;
  bankAccount: string;
  bankCode: string;
  accountName: string;
  apiKey: string;
  prefix: string;
};

type NormalizedSepayWebhook = {
  transactionId: string;
  providerRef: string | null;
  amount: number;
  direction: string;
  content: string;
  isIncoming: boolean;
};

@Injectable()
// Lớp BookingsService tập trung các quy tắc nghiệp vụ và phối hợp truy cập dữ liệu.
export class BookingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly seatHoldsService: SeatHoldsService,
  ) {}

  // Đọc và lọc dữ liệu cần thiết trong khối getPaymentMethods.
  getPaymentMethods() {
    const sepayEnabled = this.isSepayConfigured();
    const vnpayDemo = this.isVnpayDemoMode();
    const vnpayConfigured = Boolean(
      process.env.VNPAY_TMN_CODE?.trim() &&
        process.env.VNPAY_HASH_SECRET?.trim() &&
        !process.env.VNPAY_TMN_CODE?.startsWith('YOUR_') &&
        !process.env.VNPAY_HASH_SECRET?.startsWith('YOUR_'),
    );

    return {
      methods: [
        {
          id: 'sepay',
          enabled: sepayEnabled,
          mode: sepayEnabled ? 'live' : 'unavailable',
        },
        {
          id: 'vnpay',
          enabled: vnpayDemo || vnpayConfigured,
          mode: vnpayDemo ? 'demo' : 'live',
        },
        { id: 'momo', enabled: true, mode: 'demo' },
        { id: 'zalopay', enabled: true, mode: 'demo' },
        { id: 'card', enabled: true, mode: 'demo' },
      ],
    };
  }

  // Tạo dữ liệu mới trong khối create và trả về kết quả đã chuẩn hóa.
  async create(createBookingDto: CreateBookingDto) {
    const { userId, showtimeId } = createBookingDto;
    const showtimeSeatIds = [...new Set(createBookingDto.showtimeSeatIds)];

    // Kiểm tra trạng thái và ràng buộc ghế trước khi thay đổi booking.
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

    // Kiểm tra danh tính hoặc quyền sở hữu trước khi thao tác trên dữ liệu.
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Chặn luồng hiện tại khi dữ liệu hoặc điều kiện bắt buộc chưa được đáp ứng.
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

    // Kiểm tra trạng thái và ràng buộc ghế trước khi thay đổi booking.
    if (showtimeSeats.length !== showtimeSeatIds.length) {
      throw new NotFoundException('One or more seats were not found');
    }

    const wrongShowtimeSeat = showtimeSeats.find(
      (showtimeSeat) => showtimeSeat.showtimeId !== showtimeId,
    );

    // Kiểm tra trạng thái và ràng buộc ghế trước khi thay đổi booking.
    if (wrongShowtimeSeat) {
      throw new BadRequestException(
        'One or more seats do not belong to this showtime',
      );
    }

    const unavailableSeat = showtimeSeats.find(
      (showtimeSeat) => showtimeSeat.status !== 'AVAILABLE',
    );

    // Kiểm tra trạng thái và ràng buộc ghế trước khi thay đổi booking.
    if (unavailableSeat) {
      throw new ConflictException('One or more seats are not available');
    }

    await this.validateNoOrphanStandardSeat(showtimeId, showtimeSeats);

    const totalAmount = showtimeSeats.reduce(
      (sum, showtimeSeat) => sum + Number(showtimeSeat.price),
      0,
    );
    const expiresAt = new Date(
      Date.now() + this.getBookingHoldMinutes() * 60 * 1000,
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
      }),
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

  // Kiểm tra điều kiện nghiệp vụ trong khối validateNoOrphanStandardSeat trước khi tiếp tục.
  private async validateNoOrphanStandardSeat(
    showtimeId: string,
    selectedSeats: Array<{
      id: string;
      seat: { row: string; number: number; position: number; type: string };
    }>,
  ) {
    const selectedStandardRows = [
      ...new Set(
        selectedSeats
          .filter((item) => item.seat.type !== 'COUPLE')
          .map((item) => item.seat.row),
      ),
    ];
    // Kiểm tra số lượng phần tử để xử lý trường hợp rỗng hoặc vượt giới hạn.
    if (!selectedStandardRows.length) return;

    const rowSeats = await this.prisma.showtimeSeat.findMany({
      where: {
        showtimeId,
        seat: { row: { in: selectedStandardRows }, type: 'STANDARD' },
      },
      include: { seat: true },
      orderBy: [{ seat: { row: 'asc' } }, { seat: { position: 'asc' } }],
    });
    const holds = await this.seatHoldsService.listByShowtime(
      showtimeId,
      rowSeats.map((item) => item.id),
    );
    const heldIds = new Set(holds.map((hold) => hold.showtimeSeatId));
    const selectedIds = new Set(selectedSeats.map((item) => item.id));
    const byRow = new Map<string, typeof rowSeats>();
    // Duyệt tập dữ liệu để xử lý từng phần tử theo cùng một quy tắc.
    for (const item of rowSeats) {
      const seats = byRow.get(item.seat.row) || [];
      seats.push(item);
      byRow.set(item.seat.row, seats);
    }

    // Duyệt tập dữ liệu để xử lý từng phần tử theo cùng một quy tắc.
    for (const [row, seats] of byRow) {
      const blocks: Array<typeof rowSeats> = [];
      // Duyệt tập dữ liệu để xử lý từng phần tử theo cùng một quy tắc.
      for (const seat of seats) {
        const block = blocks.at(-1);
        const previous = block?.at(-1);
        // Đánh giá điều kiện để chọn nhánh xử lý phù hợp và tránh cập nhật sai trạng thái.
        if (
          !block ||
          !previous ||
          seat.seat.position !== previous.seat.position + 1
        ) {
          blocks.push([seat]);
        } else {
          block.push(seat);
        }
      }
      // Duyệt tập dữ liệu để xử lý từng phần tử theo cùng một quy tắc.
      for (const block of blocks) {
        // Duyệt tập dữ liệu để xử lý từng phần tử theo cùng một quy tắc.
        for (let index = 1; index < block.length - 1; index += 1) {
          const current = block[index];
          const remainsAvailable =
            current.status === 'AVAILABLE' &&
            !selectedIds.has(current.id) &&
            !heldIds.has(current.id);
          // Chặn luồng hiện tại khi dữ liệu hoặc điều kiện bắt buộc chưa được đáp ứng.
          if (!remainsAvailable) continue;
          const neighborAvailable = [block[index - 1], block[index + 1]].some(
            (neighbor) =>
              neighbor.status === 'AVAILABLE' &&
              !selectedIds.has(neighbor.id) &&
              !heldIds.has(neighbor.id),
          );
          // Chặn luồng hiện tại khi dữ liệu hoặc điều kiện bắt buộc chưa được đáp ứng.
          if (!neighborAvailable) {
            throw new BadRequestException(
              `Không được để lại một ghế trống cô lập tại hàng ${row}, ghế ${current.seat.number}`,
            );
          }
        }
      }
    }
  }

  // Cập nhật trạng thái hoặc dữ liệu trong khối updateBookingCombos.
  async updateBookingCombos(bookingId: string, dto: UpdateBookingCombosDto) {
    const items = dto.items || [];
    const normalizedItems = items.filter((item) => item.quantity > 0);
    const comboIds = normalizedItems.map((item) => item.comboId);
    const duplicateCombo = new Set(comboIds).size !== comboIds.length;
    // Đánh giá điều kiện để chọn nhánh xử lý phù hợp và tránh cập nhật sai trạng thái.
    if (duplicateCombo) {
      throw new BadRequestException('Duplicate combos are not allowed');
    }

    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        bookingItems: true,
      },
    });
    // Chặn luồng hiện tại khi dữ liệu hoặc điều kiện bắt buộc chưa được đáp ứng.
    if (!booking) throw new NotFoundException('Booking not found');
    // Rẽ nhánh theo trạng thái hiện tại để chỉ cho phép luồng nghiệp vụ hợp lệ.
    if (booking.status !== 'PENDING') {
      throw new BadRequestException('Only pending bookings can be updated');
    }

    const combos = comboIds.length
      ? await this.prisma.concessionCombo.findMany({
          where: { id: { in: comboIds }, isActive: true },
        })
      : [];
    // Kiểm tra số lượng phần tử để xử lý trường hợp rỗng hoặc vượt giới hạn.
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
      // Kiểm tra số lượng phần tử để xử lý trường hợp rỗng hoặc vượt giới hạn.
      if (normalizedItems.length) {
        await tx.bookingComboItem.createMany({
          data: normalizedItems.map((item) => {
            const combo = combosById.get(item.comboId);
            // Chặn luồng hiện tại khi dữ liệu hoặc điều kiện bắt buộc chưa được đáp ứng.
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

  // Thực hiện bước thanh toán trong khối pay với kiểm tra trạng thái an toàn.
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
        payments: {
          where: { status: 'SUCCESS' },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        tickets: {
          include: {
            bookingItem: {
              include: {
                showtimeSeat: { include: { seat: true } },
              },
            },
          },
        },
      },
    });

    // Chặn luồng hiện tại khi dữ liệu hoặc điều kiện bắt buộc chưa được đáp ứng.
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // Rẽ nhánh theo trạng thái hiện tại để chỉ cho phép luồng nghiệp vụ hợp lệ.
    if (booking.status === 'PAID') {
      const payment = booking.payments[0];
      // Kiểm tra điều kiện thanh toán trước khi cập nhật dữ liệu liên quan.
      if (!payment) {
        throw new ConflictException('Paid booking has no successful payment');
      }
      return {
        bookingId: booking.id,
        status: booking.status,
        payment: {
          id: payment.id,
          status: payment.status,
          amount: Number(payment.amount),
          currency: payment.currency,
          provider: payment.provider,
          providerRef: payment.providerRef,
          paidAt: payment.paidAt,
        },
        tickets: booking.tickets.map((ticket) => ({
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

    if (booking.status !== 'PENDING') {
      throw new BadRequestException('Only pending bookings can be paid');
    }

    // Đánh giá điều kiện để chọn nhánh xử lý phù hợp và tránh cập nhật sai trạng thái.
    if (booking.expiresAt && booking.expiresAt < new Date()) {
      throw new BadRequestException('Booking has expired');
    }

    const unheldSeat = booking.bookingItems.find(
      (bookingItem) => bookingItem.showtimeSeat.status !== 'AVAILABLE',
    );

    // Kiểm tra trạng thái và ràng buộc ghế trước khi thay đổi booking.
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

      // Kiểm tra trạng thái và ràng buộc ghế trước khi thay đổi booking.
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

    await this.seatHoldsService.releaseBookingHolds([
      {
        showtimeId: booking.showtimeId,
        showtimeSeatIds,
        userId: booking.userId,
      },
    ]);

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

  // Đọc và lọc dữ liệu cần thiết trong khối findUserTickets.
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
            comboItems: {
              include: {
                combo: true,
              },
            },
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
          comboItems: (ticket.booking.comboItems || []).map((item) => ({
            id: item.id,
            comboId: item.comboId,
            name: item.combo?.name,
            quantity: item.quantity,
            unitPrice: Number(item.unitPrice),
            lineTotal: Number(item.unitPrice) * item.quantity,
          })),
        },
      })),
    };
  }

  // Đọc và lọc dữ liệu cần thiết trong khối findUserBookings.
  async findUserBookings(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const bookings = await this.prisma.booking.findMany({
      where: { userId },
      include: {
        showtime: {
          include: {
            movie: true,
            room: { include: { cinema: true } },
          },
        },
        bookingItems: {
          include: { showtimeSeat: { include: { seat: true } } },
        },
        payments: { orderBy: { createdAt: 'desc' }, take: 1 },
        tickets: { select: { id: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      userId,
      bookings: bookings.map((booking) => ({
        id: booking.id,
        status: booking.status,
        totalAmount: Number(booking.totalAmount),
        currency: booking.currency,
        expiresAt: booking.expiresAt,
        createdAt: booking.createdAt,
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
        },
        room: {
          id: booking.showtime.room.id,
          name: booking.showtime.room.name,
        },
        seats: booking.bookingItems.map((item) => ({
          showtimeSeatId: item.showtimeSeatId,
          row: item.showtimeSeat.seat.row,
          number: item.showtimeSeat.seat.number,
          type: item.showtimeSeat.seat.type,
          unitPrice: Number(item.unitPrice),
        })),
        payment: booking.payments[0]
          ? {
              id: booking.payments[0].id,
              provider: booking.payments[0].provider,
              status: booking.payments[0].status,
              paidAt: booking.payments[0].paidAt,
            }
          : null,
        ticketCount: booking.tickets.length,
      })),
    };
  }

  // Đọc và lọc dữ liệu cần thiết trong khối findAll.
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

    return {
      bookings: bookings.map((booking) => this.mapBookingDetail(booking)),
    };
  }

  // Đọc và lọc dữ liệu cần thiết trong khối findOne.
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

  // Kiểm tra điều kiện nghiệp vụ trong khối cancel trước khi tiếp tục.
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

    await this.seatHoldsService.releaseBookingHolds([
      {
        showtimeId: booking.showtimeId,
        showtimeSeatIds,
        userId: booking.userId,
      },
    ]);

    return {
      bookingId: cancelledBooking.id,
      status: cancelledBooking.status,
      releasedSeatCount: showtimeSeatIds.length,
    };
  }

  // Đọc và lọc dữ liệu cần thiết trong khối findTicketByQr.
  async findTicketByQr(qrToken: string) {
    const ticket = await this.findTicketRecordByQr(qrToken);
    return {
      ticket: this.mapTicketDetail(ticket),
    };
  }

  // Tạo dữ liệu mới trong khối createVnpayPayment và trả về kết quả đã chuẩn hóa.
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

    // Kiểm tra điều kiện thanh toán trước khi cập nhật dữ liệu liên quan.
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

  // Thực hiện bước thanh toán trong khối onlineDemoPay với kiểm tra trạng thái an toàn.
  async onlineDemoPay(bookingId: string, provider: OnlineDemoPaymentProvider) {
    // Kiểm tra điều kiện thanh toán trước khi cập nhật dữ liệu liên quan.
    if (!this.isOnlineDemoProvider(provider)) {
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
      include: PAYMENT_WITH_BOOKING_INCLUDE,
    });

    await this.confirmPaidBookingPayment(
      payment,
      payment.providerRef || undefined,
    );

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

  // Tạo dữ liệu mới trong khối createSepayPayment và trả về kết quả đã chuẩn hóa.
  async createSepayPayment(bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { bookingItems: { include: { showtimeSeat: true } } },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.status !== 'PENDING') {
      throw new BadRequestException('Only pending bookings can be paid');
    }
    if (booking.expiresAt && booking.expiresAt < new Date()) {
      throw new BadRequestException('Booking has expired');
    }
    await this.seatHoldsService.verifyBookingHolds({
      userId: booking.userId,
      showtimeId: booking.showtimeId,
      showtimeSeatIds: booking.bookingItems.map((item) => item.showtimeSeatId),
    });

    const config = this.getSepayConfig();
    // Kiểm tra số lượng phần tử để xử lý trường hợp rỗng hoặc vượt giới hạn.
    if (!this.isSepayConfigured(config)) {
      throw new BadRequestException('SePay bank account is not configured');
    }
    let payment = await this.prisma.payment.findFirst({
      where: {
        bookingId,
        provider: SEPAY_PROVIDER,
        status: 'PENDING',
        OR: [{ expiredAt: null }, { expiredAt: { gt: new Date() } }],
      },
      orderBy: { createdAt: 'desc' },
    });
    // Kiểm tra điều kiện thanh toán trước khi cập nhật dữ liệu liên quan.
    if (!payment) {
      payment = await this.prisma.payment.create({
        data: {
          bookingId,
          provider: SEPAY_PROVIDER,
          providerRef: this.buildSepayProviderRef(booking.id, config.prefix),
          amount: booking.totalAmount,
          currency: 'VND',
          status: 'PENDING',
          expiredAt: booking.expiresAt,
        },
      });
    }
    const description = payment.providerRef || payment.id;
    const params = new URLSearchParams({
      acc: config.bankAccount,
      bank: config.bankCode,
      amount: String(Math.round(Number(payment.amount))),
      des: description,
    });
    return {
      bookingId,
      paymentId: payment.id,
      provider: 'SEPAY',
      status: payment.status,
      providerRef: description,
      transferContent: description,
      paymentCode: description,
      amount: Number(payment.amount),
      currency: payment.currency,
      bankAccount: config.bankAccount,
      accountNumber: config.bankAccount,
      accountName: config.accountName,
      bankCode: config.bankCode,
      qrUrl: `https://vietqr.app/img?${params.toString()}`,
      expiresAt: payment.expiredAt || booking.expiresAt,
    };
  }

  // Điều phối sự kiện và phản hồi người dùng trong khối handleSepayWebhook.
  async handleSepayWebhook(
    authorization: string | undefined,
    payload: Record<string, unknown>,
  ) {
    const config = this.getSepayConfig();
    // Chặn luồng hiện tại khi dữ liệu hoặc điều kiện bắt buộc chưa được đáp ứng.
    if (!config.apiKey || authorization !== `Apikey ${config.apiKey}`) {
      throw new UnauthorizedException('Invalid SePay webhook API key');
    }
    const normalized = this.normalizeSepayWebhook(payload, config.prefix);
    const event = await this.createWebhookEvent(normalized, payload);
    // Chặn luồng hiện tại khi dữ liệu hoặc điều kiện bắt buộc chưa được đáp ứng.
    if (!normalized.transactionId || !Number.isFinite(normalized.amount)) {
      await this.completeWebhookEvent(
        event.id,
        'INVALID',
        'Invalid SePay webhook payload',
      );
      return { success: true, ignored: true, reason: 'INVALID_PAYLOAD' };
    }

    if (!normalized.isIncoming) {
      await this.completeWebhookEvent(event.id, 'IGNORED', 'Outgoing transfer');
      return { success: true, ignored: true, reason: 'OUTGOING_TRANSFER' };
    }

    if (!normalized.providerRef) {
      await this.completeWebhookEvent(
        event.id,
        'REVIEW_REQUIRED',
        'Transfer content does not contain payment code',
      );
      return {
        success: true,
        reviewRequired: true,
        reason: 'PAYMENT_CODE_NOT_FOUND',
      };
    }

    const duplicate = await this.prisma.payment.findUnique({
      where: { providerTransactionId: normalized.transactionId },
    });
    // Đánh giá điều kiện để chọn nhánh xử lý phù hợp và tránh cập nhật sai trạng thái.
    if (duplicate) {
      await this.completeWebhookEvent(event.id, 'DUPLICATE');
      return { success: true, duplicate: true };
    }

    const payment = await this.prisma.payment.findFirst({
      where: {
        provider: SEPAY_PROVIDER,
        providerRef: normalized.providerRef,
      },
      include: PAYMENT_WITH_BOOKING_INCLUDE,
    });
    // Kiểm tra điều kiện thanh toán trước khi cập nhật dữ liệu liên quan.
    if (!payment) {
      await this.completeWebhookEvent(
        event.id,
        'REVIEW_REQUIRED',
        'SePay payment code not found',
      );
      return { success: true, reviewRequired: true, reason: 'PAYMENT_NOT_FOUND' };
    }
    // Rẽ nhánh theo trạng thái hiện tại để chỉ cho phép luồng nghiệp vụ hợp lệ.
    if (payment.status === 'SUCCESS') {
      await this.completeWebhookEvent(event.id, 'DUPLICATE');
      return { success: true, duplicate: true };
    }
    // Kiểm tra điều kiện thanh toán trước khi cập nhật dữ liệu liên quan.
    if (normalized.amount !== Number(payment.amount)) {
      await this.markPaymentForReview(
        payment.id,
        normalized.transactionId,
        'SePay transfer amount does not match booking',
      );
      await this.completeWebhookEvent(
        event.id,
        'REVIEW_REQUIRED',
        'SePay transfer amount does not match booking',
      );
      return { success: true, reviewRequired: true, reason: 'AMOUNT_MISMATCH' };
    }
    if (payment.booking.status !== 'PENDING') {
      await this.markPaymentForReview(
        payment.id,
        normalized.transactionId,
        'Booking is not pending',
      );
      await this.completeWebhookEvent(
        event.id,
        'REVIEW_REQUIRED',
        'Booking is not pending',
      );
      return {
        success: true,
        reviewRequired: true,
        reason: 'BOOKING_NOT_PENDING',
      };
    }

    if (payment.booking.expiresAt && payment.booking.expiresAt < new Date()) {
      await this.markPaymentForReview(
        payment.id,
        normalized.transactionId,
        'Booking has expired',
      );
      await this.completeWebhookEvent(
        event.id,
        'REVIEW_REQUIRED',
        'Booking has expired',
      );
      return { success: true, reviewRequired: true, reason: 'BOOKING_EXPIRED' };
    }

    await this.confirmPaidBookingPayment(
      payment,
      payment.providerRef || undefined,
      normalized.transactionId,
    );
    await this.completeWebhookEvent(event.id, 'PROCESSED');
    return { success: true, bookingId: payment.bookingId };
  }

  // Điều phối sự kiện và phản hồi người dùng trong khối handleVnpayReturn.
  async handleVnpayReturn(query: Record<string, string>) {
    const config = this.getVnpayConfig();
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const secureHash = query.vnp_SecureHash;
    const signedParams = { ...query };
    delete signedParams.vnp_SecureHash;
    delete signedParams.vnp_SecureHashType;

    const expectedHash = this.signVnpayParams(signedParams, config.hashSecret);
    const providerRef = query.vnp_TxnRef;

    // Đánh giá điều kiện để chọn nhánh xử lý phù hợp và tránh cập nhật sai trạng thái.
    if (
      !secureHash ||
      secureHash.toLowerCase() !== expectedHash.toLowerCase()
    ) {
      return `${frontendUrl}/#/payment?payment=invalid-signature`;
    }

    const payment = await this.prisma.payment.findFirst({
      where: {
        provider: 'vnpay',
        providerRef,
      },
      include: PAYMENT_WITH_BOOKING_INCLUDE,
    });

    if (!payment) {
      return `${frontendUrl}/#/payment?payment=not-found`;
    }

    const expectedAmount = String(Math.round(Number(payment.amount) * 100));
    // Chặn luồng hiện tại khi dữ liệu hoặc điều kiện bắt buộc chưa được đáp ứng.
    if (query.vnp_Amount !== expectedAmount) {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'FAILED' },
      });
      return `${frontendUrl}/#/payment?payment=amount-mismatch&bookingId=${payment.bookingId}`;
    }

    const success =
      query.vnp_ResponseCode === '00' && query.vnp_TransactionStatus === '00';

    // Chặn luồng hiện tại khi dữ liệu hoặc điều kiện bắt buộc chưa được đáp ứng.
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

    // Rẽ nhánh theo trạng thái hiện tại để chỉ cho phép luồng nghiệp vụ hợp lệ.
    if (payment.booking.status === 'PAID') {
      return `${frontendUrl}/#/ticket/${payment.bookingId}?payment=success`;
    }

    // Rẽ nhánh theo trạng thái hiện tại để chỉ cho phép luồng nghiệp vụ hợp lệ.
    if (payment.booking.status !== 'PENDING') {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'FAILED' },
      });
      return `${frontendUrl}/#/payment?payment=failed&bookingId=${payment.bookingId}`;
    }

    // Kiểm tra điều kiện thanh toán trước khi cập nhật dữ liệu liên quan.
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

  // Điều phối sự kiện và phản hồi người dùng trong khối handleVnpayDemoReturn.
  async handleVnpayDemoReturn(providerRef: string) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    // Kiểm tra điều kiện thanh toán trước khi cập nhật dữ liệu liên quan.
    if (!this.isVnpayDemoMode()) {
      return `${frontendUrl}/#/payment?payment=demo-disabled`;
    }

    const payment = await this.prisma.payment.findFirst({
      where: {
        provider: 'vnpay-demo',
        providerRef,
      },
      include: PAYMENT_WITH_BOOKING_INCLUDE,
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

  // Đọc và lọc dữ liệu cần thiết trong khối findBookingTickets.
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
      include: TICKET_DETAIL_INCLUDE,
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

  // Trả trạng thái thanh toán gọn cho frontend polling SePay mà không cần đọc màn admin.
  async getPaymentStatus(bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        payments: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        tickets: {
          orderBy: { issuedAt: 'asc' },
          take: 1,
        },
      },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    const payment = booking.payments[0] || null;
    const ticket = booking.tickets[0] || null;

    return {
      bookingId: booking.id,
      bookingStatus: booking.status,
      paymentStatus: payment?.status || null,
      expiresAt: payment?.expiredAt || booking.expiresAt,
      ticketId: ticket?.id || null,
      paymentId: payment?.id || null,
      providerRef: payment?.providerRef || null,
    };
  }

  // Đọc và lọc dữ liệu cần thiết trong khối findBookingByQr.
  async findBookingByQr(bookingQrToken: string) {
    const bookingId = this.parseBookingQrToken(bookingQrToken);
    return this.findBookingTickets(bookingId);
  }

  // Kiểm tra điều kiện nghiệp vụ trong khối checkInBookingByQr trước khi tiếp tục.
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

    // Rẽ nhánh theo trạng thái hiện tại để chỉ cho phép luồng nghiệp vụ hợp lệ.
    if (booking.status !== 'PAID') {
      throw new BadRequestException('Only paid bookings can be checked in');
    }

    const validTicketIds = booking.tickets
      .filter((ticket) => ticket.status === 'VALID' && !ticket.checkIn)
      .map((ticket) => ticket.id);

    // Kiểm tra số lượng phần tử để xử lý trường hợp rỗng hoặc vượt giới hạn.
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

  // Kiểm tra điều kiện nghiệp vụ trong khối checkInTicket trước khi tiếp tục.
  async checkInTicket(qrToken: string, checkInTicketDto: CheckInTicketDto) {
    const ticket = await this.findTicketRecordByQr(qrToken);

    // Rẽ nhánh theo trạng thái hiện tại để chỉ cho phép luồng nghiệp vụ hợp lệ.
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
        include: TICKET_DETAIL_INCLUDE,
      });

      return updatedTicket;
    });

    return {
      ticket: this.mapTicketDetail(result),
    };
  }

  // Xử lý việc gỡ bỏ, hủy hoặc giải phóng dữ liệu trong khối expirePendingBookings.
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

    // Kiểm tra số lượng phần tử để xử lý trường hợp rỗng hoặc vượt giới hạn.
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

      await tx.payment.updateMany({
        where: {
          bookingId: {
            in: expiredBookingIds,
          },
          status: 'PENDING',
        },
        data: {
          status: 'EXPIRED',
          expiredAt: new Date(),
        },
      });

      return {
        expiredBookingCount: updatedBookings.count,
        releasedSeatCount: showtimeSeatIds.length,
      };
    });

    await this.seatHoldsService.releaseBookingHolds(
      expiredBookings.map((booking) => ({
        showtimeId: booking.showtimeId,
        userId: booking.userId,
        showtimeSeatIds: booking.bookingItems.map(
          (bookingItem) => bookingItem.showtimeSeatId,
        ),
      })),
    );

    return result;
  }

  // Đọc và lọc dữ liệu cần thiết trong khối findTicketRecordByQr.
  private async findTicketRecordByQr(qrToken: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { qrToken },
      include: TICKET_DETAIL_INCLUDE,
    });

    // Chặn luồng hiện tại khi dữ liệu hoặc điều kiện bắt buộc chưa được đáp ứng.
    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    return ticket;
  }

  // Thực hiện trách nhiệm riêng của khối ticketDetailInclude.
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

  // Thực hiện trách nhiệm riêng của khối bookingDetailInclude.
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

  // Chuẩn hóa dữ liệu đầu vào/đầu ra trong khối mapBookingDetail.
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
          [booking.user.firstName, booking.user.lastName]
            .filter(Boolean)
            .join(' ') || booking.user.email,
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

  // Chuẩn hóa dữ liệu đầu vào/đầu ra trong khối mapTicketDetail.
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
        name:
          [ticket.booking.user.firstName, ticket.booking.user.lastName]
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

  // Thực hiện trách nhiệm riêng của khối bookingQrToken.
  private bookingQrToken(bookingId: string) {
    return `${BOOKING_QR_PREFIX}${bookingId}`;
  }

  // Chuẩn hóa dữ liệu đầu vào/đầu ra trong khối parseBookingQrToken.
  private parseBookingQrToken(bookingQrToken: string) {
    const decoded = decodeURIComponent(bookingQrToken || '');
    // Chặn luồng hiện tại khi dữ liệu hoặc điều kiện bắt buộc chưa được đáp ứng.
    if (!decoded.startsWith(BOOKING_QR_PREFIX)) {
      throw new BadRequestException('Invalid booking QR token');
    }

    const bookingId = decoded.slice(BOOKING_QR_PREFIX.length);
    // Chặn luồng hiện tại khi dữ liệu hoặc điều kiện bắt buộc chưa được đáp ứng.
    if (!bookingId) {
      throw new BadRequestException('Invalid booking QR token');
    }

    return bookingId;
  }

  // Đọc và lọc dữ liệu cần thiết trong khối getVnpayConfig.
  // Đọc thời gian giữ booking từ env để các luồng thanh toán dùng cùng một giới hạn.
  private getBookingHoldMinutes() {
    const rawValue = Number(process.env.BOOKING_HOLD_MINUTES);
    if (!Number.isFinite(rawValue) || rawValue <= 0) {
      return DEFAULT_BOOKING_HOLD_MINUTES;
    }
    return rawValue;
  }

  // Gom cấu hình SePay ở một nơi để tránh đọc env rải rác trong nhiều endpoint.
  private getSepayConfig(): SepayConfig {
    return {
      enabled: process.env.SEPAY_ENABLED === 'true',
      bankAccount: process.env.SEPAY_BANK_ACCOUNT?.trim() || '',
      bankCode: process.env.SEPAY_BANK_CODE?.trim() || '',
      accountName: process.env.SEPAY_ACCOUNT_NAME?.trim() || '',
      apiKey: process.env.SEPAY_API_KEY?.trim() || '',
      prefix:
        process.env.SEPAY_PAYMENT_PREFIX?.trim().toUpperCase() ||
        DEFAULT_SEPAY_PAYMENT_PREFIX,
    };
  }

  // SePay chỉ bật khi đã có đầy đủ thông tin ngân hàng và khóa webhook.
  private isSepayConfigured(config = this.getSepayConfig()) {
    return Boolean(
      config.enabled &&
        config.bankAccount &&
        config.bankCode &&
        config.accountName &&
        config.apiKey,
    );
  }

  // Mã chuyển khoản có prefix ổn định để webhook nhận diện đúng booking.
  private buildSepayProviderRef(bookingId: string, prefix: string) {
    const suffix = bookingId.replace(/[^a-zA-Z0-9]/g, '').slice(-14);
    return `${prefix}${suffix}`.toUpperCase();
  }

  // Chuẩn hóa payload SePay để chịu được khác biệt nhỏ giữa các cấu hình webhook.
  private normalizeSepayWebhook(
    payload: Record<string, unknown>,
    prefix: string,
  ): NormalizedSepayWebhook {
    const content = String(
      payload.content ||
        payload.description ||
        payload.transferContent ||
        payload.code ||
        '',
    );
    const direction = String(
      payload.transferType || payload.type || payload.direction || '',
    ).toLowerCase();
    const transactionId = String(
      payload.id ||
        payload.referenceCode ||
        payload.transactionId ||
        payload.gatewayTransactionId ||
        '',
    ).trim();
    const amount = Number(
      payload.transferAmount || payload.amount || payload.money || 0,
    );
    const upperContent = `${String(payload.code || '')} ${content}`.toUpperCase();
    const escapedPrefix = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const providerRef =
      upperContent.match(new RegExp(`${escapedPrefix}[A-Z0-9]+`))?.[0] ||
      null;
    const isIncoming =
      direction === 'in' ||
      direction.includes('credit') ||
      direction.includes('incoming') ||
      payload.isIncome === true;

    return {
      transactionId,
      providerRef,
      amount,
      direction,
      content,
      isIncoming,
    };
  }

  // Lược bỏ các trường nhạy cảm khỏi payload trước khi lưu log webhook.
  private sanitizeWebhookPayload(
    payload: Record<string, unknown>,
  ): Prisma.InputJsonValue {
    const blockedKeys = new Set([
      'authorization',
      'apiKey',
      'apikey',
      'token',
      'secret',
      'password',
    ]);
    const sanitized = Object.fromEntries(
      Object.entries(payload).filter(
        ([key]) => !blockedKeys.has(key.toLowerCase()),
      ),
    );
    return JSON.parse(JSON.stringify(sanitized)) as Prisma.InputJsonValue;
  }

  // Lưu webhook ngay khi nhận để có dấu vết đối soát khi giao dịch bị lệch.
  private createWebhookEvent(
    normalized: NormalizedSepayWebhook,
    payload: Record<string, unknown>,
  ) {
    return this.prisma.paymentWebhookEvent.create({
      data: {
        provider: SEPAY_PROVIDER,
        transactionId: normalized.transactionId || null,
        providerRef: normalized.providerRef,
        amount: Number.isFinite(normalized.amount) ? normalized.amount : null,
        direction: normalized.direction || null,
        status: 'RECEIVED',
        payload: this.sanitizeWebhookPayload(payload),
      },
    });
  }

  // Cập nhật kết quả xử lý webhook sau khi đã xác nhận hoặc cần đối soát.
  private completeWebhookEvent(
    id: string,
    status: string,
    errorMessage?: string,
  ) {
    return this.prisma.paymentWebhookEvent.update({
      where: { id },
      data: {
        status,
        errorMessage,
        processedAt: new Date(),
      },
    });
  }

  // Sai tiền hoặc sai trạng thái sẽ chuyển payment sang đối soát, không phát hành vé.
  private markPaymentForReview(
    paymentId: string,
    providerTransactionId: string,
    reason: string,
  ) {
    return this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: 'REVIEW_REQUIRED',
        providerTransactionId,
      },
    });
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

    // Chặn luồng hiện tại khi dữ liệu hoặc điều kiện bắt buộc chưa được đáp ứng.
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

  // Kiểm tra điều kiện nghiệp vụ trong khối isVnpayDemoMode trước khi tiếp tục.
  private isVnpayDemoMode() {
    return process.env.VNPAY_DEMO_MODE === 'true';
  }

  // Tạo dữ liệu mới trong khối createVnpayDemoPayment và trả về kết quả đã chuẩn hóa.
  private async createVnpayDemoPayment(
    booking: PaymentBooking,
    request: Request,
  ) {
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

  // Đọc và lọc dữ liệu cần thiết trong khối getBackendPublicUrl.
  private getBackendPublicUrl(request: Request) {
    const forwardedProto = request.headers['x-forwarded-proto'];
    const proto =
      typeof forwardedProto === 'string'
        ? forwardedProto.split(',')[0].trim()
        : request.protocol || 'http';
    const host = request.headers.host || 'localhost:3000';
    return `${proto}://${host}`;
  }

  // Thực hiện bước thanh toán trong khối confirmPaidBookingPayment với kiểm tra trạng thái an toàn.
  private async confirmPaidBookingPayment(
    payment: PaymentWithBooking,
    providerRef?: string,
    providerTransactionId?: string,
  ) {
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
          providerTransactionId,
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

    await this.seatHoldsService.releaseBookingHolds([
      {
        showtimeId: payment.booking.showtimeId,
        showtimeSeatIds,
        userId: payment.booking.userId,
      },
    ]);
  }

  // Đọc và lọc dữ liệu cần thiết trong khối getClientIp.
  private getClientIp(request: Request) {
    const forwardedFor = request.headers['x-forwarded-for'];
    // Đánh giá điều kiện để chọn nhánh xử lý phù hợp và tránh cập nhật sai trạng thái.
    if (typeof forwardedFor === 'string') {
      return forwardedFor.split(',')[0].trim();
    }
    return request.ip || request.socket.remoteAddress || '127.0.0.1';
  }

  // Kiểm tra điều kiện nghiệp vụ trong khối isOnlineDemoProvider trước khi tiếp tục.
  private isOnlineDemoProvider(
    provider: string,
  ): provider is OnlineDemoPaymentProvider {
    return (ONLINE_DEMO_PAYMENT_PROVIDERS as readonly string[]).includes(
      provider,
    );
  }

  // Chuẩn hóa dữ liệu đầu vào/đầu ra trong khối formatVnpayDate.
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

  // Thực hiện bước thanh toán trong khối signVnpayParams với kiểm tra trạng thái an toàn.
  private signVnpayParams(params: Record<string, string>, hashSecret: string) {
    const signData = this.toVnpayQueryString(params);
    return createHmac('sha512', hashSecret).update(signData).digest('hex');
  }

  // Thực hiện bước thanh toán trong khối toVnpayQueryString với kiểm tra trạng thái an toàn.
  private toVnpayQueryString(params: Record<string, string>) {
    return Object.keys(params)
      .filter((key) => params[key] !== undefined && params[key] !== null)
      .sort()
      .map(
        (key) =>
          `${key}=${encodeURIComponent(params[key]).replace(/%20/g, '+')}`,
      )
      .join('&');
  }
}
