import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBookingDto } from './dto/create-booking.dto';

const BOOKING_HOLD_MINUTES = 10;

@Injectable()
export class BookingsService {
  constructor(private readonly prisma: PrismaService) {}

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

    const booking = await this.prisma.$transaction(async (tx) => {
      const updatedSeats = await tx.showtimeSeat.updateMany({
        where: {
          id: {
            in: showtimeSeatIds,
          },
          showtimeId,
          status: 'AVAILABLE',
        },
        data: {
          status: 'HELD',
        },
      });

      if (updatedSeats.count !== showtimeSeatIds.length) {
        throw new ConflictException('One or more seats are not available');
      }

      return tx.booking.create({
        data: {
          userId,
          showtimeId,
          status: 'PENDING',
          totalAmount,
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
        },
      });
    });

    return {
      id: booking.id,
      status: booking.status,
      totalAmount: Number(booking.totalAmount),
      currency: booking.currency,
      expiresAt: booking.expiresAt,
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
      (bookingItem) => bookingItem.showtimeSeat.status !== 'HELD',
    );

    if (unheldSeat) {
      throw new ConflictException('One or more seats are no longer held');
    }

    const showtimeSeatIds = booking.bookingItems.map(
      (bookingItem) => bookingItem.showtimeSeatId,
    );

    const paidBooking = await this.prisma.$transaction(async (tx) => {
      const updatedSeats = await tx.showtimeSeat.updateMany({
        where: {
          id: {
            in: showtimeSeatIds,
          },
          status: 'HELD',
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
        },
      })),
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
      const releasedSeats = await tx.showtimeSeat.updateMany({
        where: {
          id: {
            in: showtimeSeatIds,
          },
          status: 'HELD',
        },
        data: {
          status: 'AVAILABLE',
        },
      });

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
        releasedSeatCount: releasedSeats.count,
      };
    });

    return result;
  }
}
