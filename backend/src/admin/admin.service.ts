import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MovieStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateCinemaDto,
  CreateGenreDto,
  CreateMovieDto,
  CreateRoomDto,
  CreateSeatDto,
  CreateShowtimeDto,
  GenerateSeatsDto,
  UpdateCinemaDto,
  UpdateGenreDto,
  UpdateMovieDto,
  UpdateRoomDto,
  UpdateSeatDto,
  UpdateShowtimeDto,
} from './dto/admin.dto';

const CLEANUP_MINUTES = 30;
const PRICE_BY_SEAT_TYPE = {
  STANDARD: 80000,
  VIP: 120000,
  COUPLE: 180000,
};

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  listGenres() {
    return this.prisma.genre.findMany({ orderBy: { name: 'asc' } });
  }

  createGenre(dto: CreateGenreDto) {
    return this.prisma.genre.create({ data: dto });
  }

  updateGenre(id: string, dto: UpdateGenreDto) {
    return this.prisma.genre.update({ where: { id }, data: dto });
  }

  deleteGenre(id: string) {
    return this.prisma.genre.delete({ where: { id } });
  }

  listMovies() {
    return this.prisma.movie.findMany({
      include: { genres: { include: { genre: true } }, _count: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  createMovie(dto: CreateMovieDto) {
    return this.prisma.movie.create({
      data: this.movieData(dto),
      include: { genres: { include: { genre: true } } },
    });
  }

  async updateMovie(id: string, dto: UpdateMovieDto) {
    await this.ensureMovie(id);
    return this.prisma.$transaction(async (tx) => {
      if (dto.genreIds) {
        await tx.movieGenre.deleteMany({ where: { movieId: id } });
      }
      return tx.movie.update({
        where: { id },
        data: this.movieData(dto, id),
        include: { genres: { include: { genre: true } } },
      });
    });
  }

  deleteMovie(id: string) {
    return this.prisma.movie.delete({ where: { id } });
  }

  listCinemas() {
    return this.prisma.cinema.findMany({
      where: { city: 'Da Nang' },
      include: { rooms: true },
      orderBy: { name: 'asc' },
    });
  }

  createCinema(dto: CreateCinemaDto) {
    return this.prisma.cinema.create({
      data: { ...dto, city: dto.city || 'Da Nang' },
    });
  }

  updateCinema(id: string, dto: UpdateCinemaDto) {
    return this.prisma.cinema.update({ where: { id }, data: dto });
  }

  deleteCinema(id: string) {
    return this.prisma.cinema.delete({ where: { id } });
  }

  listRooms() {
    return this.prisma.room.findMany({
      include: { cinema: true, _count: { select: { seats: true, showtimes: true } } },
      orderBy: [{ cinemaId: 'asc' }, { name: 'asc' }],
    });
  }

  async createRoom(dto: CreateRoomDto) {
    await this.ensureCinema(dto.cinemaId);
    return this.prisma.room.create({ data: dto });
  }

  updateRoom(id: string, dto: UpdateRoomDto) {
    return this.prisma.room.update({ where: { id }, data: dto });
  }

  deleteRoom(id: string) {
    return this.prisma.room.delete({ where: { id } });
  }

  listSeats() {
    return this.prisma.seat.findMany({
      include: { room: { include: { cinema: true } } },
      orderBy: [{ roomId: 'asc' }, { row: 'asc' }, { number: 'asc' }],
    });
  }

  async createSeat(dto: CreateSeatDto) {
    await this.ensureRoom(dto.roomId);
    return this.prisma.seat.create({
      data: { ...dto, type: dto.type || 'STANDARD' },
    });
  }

  updateSeat(id: string, dto: UpdateSeatDto) {
    return this.prisma.seat.update({ where: { id }, data: dto });
  }

  deleteSeat(id: string) {
    return this.prisma.seat.delete({ where: { id } });
  }

  async generateSeats(roomId: string, dto: GenerateSeatsDto) {
    const room = await this.ensureRoom(roomId);
    const coupleRows = new Set(dto.coupleRows || []);
    const vipZone = this.getVipZone(dto.rows, dto.columns);
    const seats: Prisma.SeatCreateManyInput[] = [];

    for (const row of dto.rows) {
      const isCoupleRow = coupleRows.has(row);
      const seatCount = isCoupleRow ? Math.floor(dto.columns / 2) : dto.columns;
      for (let number = 1; number <= seatCount; number += 1) {
        const isVip =
          !isCoupleRow &&
          vipZone.rows.has(row) &&
          number >= vipZone.colStart &&
          number <= vipZone.colEnd;
        seats.push({
          roomId,
          row,
          number,
          type: isCoupleRow ? 'COUPLE' : isVip ? 'VIP' : 'STANDARD',
        });
      }
    }

    await this.prisma.$transaction([
      this.prisma.seat.deleteMany({ where: { roomId } }),
      this.prisma.seat.createMany({ data: seats }),
      this.prisma.room.update({
        where: { id: room.id },
        data: { capacity: seats.length },
      }),
    ]);

    return { roomId, createdSeatCount: seats.length };
  }

  listShowtimes() {
    return this.prisma.showtime.findMany({
      include: { movie: true, room: { include: { cinema: true } }, _count: true },
      orderBy: { startAt: 'asc' },
    });
  }

  async createShowtime(dto: CreateShowtimeDto) {
    await this.validateShowtime(dto);
    return this.prisma.$transaction(async (tx) => {
      const showtime = await tx.showtime.create({
        data: {
          movieId: dto.movieId,
          roomId: dto.roomId,
          startAt: new Date(dto.startAt),
          endAt: new Date(dto.endAt),
          basePrice: dto.basePrice,
        },
      });
      const seats = await tx.seat.findMany({ where: { roomId: dto.roomId } });
      await tx.showtimeSeat.createMany({
        data: seats.map((seat) => ({
          showtimeId: showtime.id,
          seatId: seat.id,
          price: PRICE_BY_SEAT_TYPE[seat.type],
          status: 'AVAILABLE',
        })),
      });
      return showtime;
    });
  }

  async updateShowtime(id: string, dto: UpdateShowtimeDto) {
    await this.ensureShowtime(id);
    await this.validateShowtime(dto, id);
    return this.prisma.showtime.update({
      where: { id },
      data: {
        movieId: dto.movieId,
        roomId: dto.roomId,
        startAt: new Date(dto.startAt),
        endAt: new Date(dto.endAt),
        basePrice: dto.basePrice,
      },
    });
  }

  deleteShowtime(id: string) {
    return this.prisma.showtime.delete({ where: { id } });
  }

  private movieData(dto: CreateMovieDto | UpdateMovieDto, movieId?: string) {
    const { genreIds, releaseDate, status, ...rest } = dto;
    return {
      ...rest,
      releaseDate: releaseDate ? new Date(releaseDate) : undefined,
      status: status as MovieStatus | undefined,
      genres: genreIds
        ? {
            create: genreIds.map((genreId) => ({
              genre: { connect: { id: genreId } },
            })),
          }
        : movieId
          ? undefined
          : { create: [] },
    };
  }

  private async validateShowtime(dto: CreateShowtimeDto, ignoreId?: string) {
    const startAt = new Date(dto.startAt);
    const endAt = new Date(dto.endAt);
    if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
      throw new BadRequestException('Invalid showtime date');
    }
    if (startAt >= endAt) {
      throw new BadRequestException('Showtime startAt must be before endAt');
    }

    const [movie, room] = await Promise.all([
      this.prisma.movie.findUnique({ where: { id: dto.movieId } }),
      this.prisma.room.findUnique({ where: { id: dto.roomId } }),
    ]);
    if (!movie) throw new NotFoundException('Movie not found');
    if (!room) throw new NotFoundException('Room not found');
    if (movie.status === 'DRAFT' || movie.status === 'ENDED') {
      throw new BadRequestException('Movie must be available for scheduling');
    }

    const conflict = await this.prisma.showtime.findFirst({
      where: {
        id: ignoreId ? { not: ignoreId } : undefined,
        roomId: dto.roomId,
        startAt: { lt: this.addMinutes(endAt, CLEANUP_MINUTES) },
        endAt: { gt: this.addMinutes(startAt, -CLEANUP_MINUTES) },
      },
    });

    if (conflict) {
      throw new ConflictException(
        'Showtime overlaps this room or violates 30-minute cleanup time',
      );
    }
  }

  private getVipZone(rows: string[], columns: number) {
    const zoneRowCount = Math.min(3, rows.length);
    const zoneColCount = Math.min(5, columns);
    const rowStart = Math.max(0, Math.round((rows.length - zoneRowCount) / 2));
    const colStart = Math.max(1, Math.round((columns - zoneColCount) / 2) + 1);
    return {
      rows: new Set(rows.slice(rowStart, rowStart + zoneRowCount)),
      colStart,
      colEnd: colStart + zoneColCount - 1,
    };
  }

  private addMinutes(date: Date, minutes: number) {
    return new Date(date.getTime() + minutes * 60 * 1000);
  }

  private async ensureCinema(id: string) {
    const cinema = await this.prisma.cinema.findUnique({ where: { id } });
    if (!cinema) throw new NotFoundException('Cinema not found');
    return cinema;
  }

  private async ensureRoom(id: string) {
    const room = await this.prisma.room.findUnique({ where: { id } });
    if (!room) throw new NotFoundException('Room not found');
    return room;
  }

  private async ensureMovie(id: string) {
    const movie = await this.prisma.movie.findUnique({ where: { id } });
    if (!movie) throw new NotFoundException('Movie not found');
    return movie;
  }

  private async ensureShowtime(id: string) {
    const showtime = await this.prisma.showtime.findUnique({ where: { id } });
    if (!showtime) throw new NotFoundException('Showtime not found');
    return showtime;
  }
}
