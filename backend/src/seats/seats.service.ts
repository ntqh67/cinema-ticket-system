/**
 * Mục đích: Cài đặt nghiệp vụ sơ đồ và trạng thái ghế; dữ liệu bền vững được truy cập qua Prisma.
 */
import { Injectable, NotFoundException } from '@nestjs/common';
import {
  formatDateInDaNang,
  formatTimeInDaNang,
} from '../common/danang-date';
import { PrismaService } from '../prisma/prisma.service';
import { SeatHoldsService } from '../seat-holds/seat-holds.service';

@Injectable()
// Lớp SeatsService tập trung các quy tắc nghiệp vụ và phối hợp truy cập dữ liệu.
export class SeatsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly seatHoldsService: SeatHoldsService,
  ) {}

  // Dựng phần giao diện tương ứng trong khối findByShowtime.
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

    // Chặn luồng hiện tại khi dữ liệu hoặc điều kiện bắt buộc chưa được đáp ứng.
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

    const holds = await this.seatHoldsService.listByShowtime(
      showtimeId,
      showtimeSeats.map((showtimeSeat) => showtimeSeat.id),
    );
    const holdsBySeatId = new Map(
      holds.map((hold) => [hold.showtimeSeatId, hold]),
    );

    return {
      showtime: {
        id: showtime.id,
        date: formatDateInDaNang(showtime.startAt),
        startTime: formatTimeInDaNang(showtime.startAt),
        endTime: formatTimeInDaNang(showtime.endAt),
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
          position: showtimeSeat.seat.position,
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
}
