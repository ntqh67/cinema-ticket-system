import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SeatHoldsService } from '../seat-holds/seat-holds.service';

@Injectable()
export class SeatsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly seatHoldsService: SeatHoldsService,
  ) {}

  async findByShowtime(
    showtimeId: string,
    viewer: { sessionId?: string; userId?: string } = {},
  ) {
    const showtime = await this.prisma.showtime.findUnique({
      where: { id: showtimeId },
      include: {
        movie: true,
        room: {
          include: {
            cinema: {
              include: {
                chain: true,
              },
            },
          },
        },
      },
    });

    if (!showtime) {
      throw new NotFoundException('Showtime not found');
    }

    const showtimeSeats = await this.prisma.showtimeSeat.findMany({
      where: { showtimeId },
      include: {
        seat: true,
      },
      orderBy: [
        {
          seat: {
            row: 'asc',
          },
        },
        {
          seat: {
            number: 'asc',
          },
        },
      ],
    });

    const holds = await this.seatHoldsService.listByShowtime(showtimeId);
    const holdsBySeatId = new Map(
      holds.map((hold) => [hold.showtimeSeatId, hold]),
    );

    return {
      showtime: {
        id: showtime.id,
        date: this.formatDate(showtime.startAt),
        startTime: this.formatTime(showtime.startAt),
        endTime: this.formatTime(showtime.endAt),
        startAt: showtime.startAt,
        endAt: showtime.endAt,
        basePrice: Number(showtime.basePrice),
        movie: {
          id: showtime.movie.id,
          title: showtime.movie.title,
        },
        room: {
          id: showtime.room.id,
          name: showtime.room.name,
          cinema: {
            id: showtime.room.cinema.id,
            name: showtime.room.cinema.name,
            chain: showtime.room.cinema.chain
              ? {
                  id: showtime.room.cinema.chain.id,
                  name: showtime.room.cinema.chain.name,
                }
              : null,
          },
        },
      },
      seats: showtimeSeats.map((showtimeSeat) => {
        const hold = holdsBySeatId.get(showtimeSeat.id);
        const heldByMe =
          !!hold &&
          ((viewer.sessionId && hold.sessionId === viewer.sessionId) ||
            (viewer.userId && hold.userId === viewer.userId));

        return {
          showtimeSeatId: showtimeSeat.id,
          seatId: showtimeSeat.seatId,
          row: showtimeSeat.seat.row,
          number: showtimeSeat.seat.number,
          type: showtimeSeat.seat.type,
          price: Number(showtimeSeat.price),
          status: hold && showtimeSeat.status === 'AVAILABLE'
            ? 'HELD'
            : showtimeSeat.status,
          heldByMe,
          holdExpiresAt: hold?.expiresAt || null,
        };
      }),
    };
  }

  private formatDate(value: Date) {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Bangkok',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(value);
  }

  private formatTime(value: Date) {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Bangkok',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(value);
  }
}
