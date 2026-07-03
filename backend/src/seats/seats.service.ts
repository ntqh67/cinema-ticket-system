import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SeatsService {
  constructor(private readonly prisma: PrismaService) {}

  async findByShowtime(showtimeId: string) {
    const showtime = await this.prisma.showtime.findUnique({
      where: { id: showtimeId },
      include: {
        movie: true,
        room: {
          include: {
            cinema: true,
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

    return {
      showtime: {
        id: showtime.id,
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
          },
        },
      },
      seats: showtimeSeats.map((showtimeSeat) => ({
        showtimeSeatId: showtimeSeat.id,
        seatId: showtimeSeat.seatId,
        row: showtimeSeat.seat.row,
        number: showtimeSeat.seat.number,
        type: showtimeSeat.seat.type,
        price: Number(showtimeSeat.price),
        status: showtimeSeat.status,
      })),
    };
  }
}
