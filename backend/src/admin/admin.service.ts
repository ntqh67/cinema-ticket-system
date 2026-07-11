import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PaymentStatus, MovieStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateCinemaDto,
  CreateConcessionComboDto,
  CreateCinemaChainDto,
  CreateGenreDto,
  CreateMovieFromTmdbDto,
  CreateMovieDto,
  ImportUpcomingMoviesFromTmdbDto,
  CreateRoomDto,
  CreateSeatDto,
  CreateShowtimeDto,
  GenerateSeatsDto,
  UpdateCinemaDto,
  UpdateConcessionComboDto,
  UpdateCinemaChainDto,
  UpdateGenreDto,
  UpdateMovieDto,
  UpdateRoomDto,
  UpdateSeatDto,
  UpdateShowtimeDto,
  UpsertCinemaTicketPriceDto,
} from './dto/admin.dto';

const CLEANUP_MINUTES = 30;
const TMDB_API_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE_URL = process.env.TMDB_IMAGE_BASE_URL || 'https://image.tmdb.org/t/p';
const TMDB_GENRE_MAP: Record<string, string> = {
  'Science Fiction': 'Sci-Fi',
  'TV Movie': 'Drama',
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

  async getDashboard() {
    const [
      movies,
      cinemas,
      showtimes,
      users,
      paidBookings,
      revenue,
    ] = await Promise.all([
      this.prisma.movie.count(),
      this.prisma.cinema.count({ where: { city: 'Da Nang' } }),
      this.prisma.showtime.count(),
      this.prisma.user.count(),
      this.prisma.booking.count({ where: { status: 'PAID' } }),
      this.prisma.payment.aggregate({
        where: { status: PaymentStatus.SUCCESS },
        _sum: { amount: true },
      }),
    ]);

    return {
      movies,
      cinemas,
      showtimes,
      users,
      bookings: paidBookings,
      revenue: Number(revenue._sum.amount || 0),
      currency: 'VND',
    };
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

  async createMovieFromTmdb(dto: CreateMovieFromTmdbDto) {
    return this.upsertMovieFromTmdb(dto.tmdbId, dto.status || 'NOW_SHOWING');
  }

  async importUpcomingMoviesFromTmdb(dto: ImportUpcomingMoviesFromTmdbDto) {
    const page = dto.page || 1;
    const limit = dto.limit || 10;
    const upcoming = await this.fetchTmdb('/movie/upcoming', {
      language: 'vi-VN',
      region: 'VN',
      page,
    });
    const results = (upcoming.results || []).slice(0, limit);
    const movies: unknown[] = [];

    for (const item of results) {
      movies.push(await this.upsertMovieFromTmdb(item.id, 'COMING_SOON'));
    }

    return {
      importedCount: movies.length,
      movies,
    };
  }

  private async upsertMovieFromTmdb(tmdbId: number, status: string) {
    const detailsVi = await this.fetchTmdb(`/movie/${tmdbId}`, { language: 'vi-VN' });
    const detailsEn =
      detailsVi.title && detailsVi.runtime
        ? detailsVi
        : await this.fetchTmdb(`/movie/${tmdbId}`, { language: 'en-US' });
    const details = {
      ...detailsEn,
      ...Object.fromEntries(
        Object.entries(detailsVi).filter(([, value]) => value !== null && value !== ''),
      ),
    };
    const trailerUrl = await this.fetchTmdbTrailer(tmdbId);
    const existingMovie = await this.prisma.movie.findFirst({ where: { tmdbId } });

    return this.prisma.$transaction(async (tx) => {
      const movieData = {
        tmdbId,
        title: details.title || detailsEn.title,
        description: details.overview || detailsEn.overview || null,
        durationMin: details.runtime || detailsEn.runtime || 100,
        releaseDate: details.release_date
          ? new Date(`${details.release_date}T00:00:00.000Z`)
          : null,
        posterUrl: this.tmdbImageUrl(details.poster_path || detailsEn.poster_path, 'w500'),
        trailerUrl,
        status: status as MovieStatus,
      };
      const movie = existingMovie
        ? await tx.movie.update({ where: { id: existingMovie.id }, data: movieData })
        : await tx.movie.create({ data: movieData });

      await tx.movieGenre.deleteMany({ where: { movieId: movie.id } });

      for (const genre of details.genres || detailsEn.genres || []) {
        const name = TMDB_GENRE_MAP[genre.name] || genre.name;
        const genreRecord = await tx.genre.upsert({
          where: { name },
          update: {},
          create: { name },
        });
        await tx.movieGenre.create({
          data: {
            movieId: movie.id,
            genreId: genreRecord.id,
          },
        });
      }

      return tx.movie.findUnique({
        where: { id: movie.id },
        include: { genres: { include: { genre: true } } },
      });
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

  listCinemaChains() {
    return this.prisma.cinemaChain.findMany({
      where: { city: 'Da Nang' },
      include: { cinemas: true },
      orderBy: { name: 'asc' },
    });
  }

  createCinemaChain(dto: CreateCinemaChainDto) {
    return this.prisma.cinemaChain.create({
      data: { ...dto, city: dto.city || 'Da Nang' },
    });
  }

  updateCinemaChain(id: string, dto: UpdateCinemaChainDto) {
    return this.prisma.cinemaChain.update({ where: { id }, data: dto });
  }

  deleteCinemaChain(id: string) {
    return this.prisma.cinemaChain.delete({ where: { id } });
  }

  listCinemas() {
    return this.prisma.cinema.findMany({
      where: { city: 'Da Nang' },
      include: { chain: true, rooms: true, ticketPrices: true },
      orderBy: { name: 'asc' },
    });
  }

  async createCinema(dto: CreateCinemaDto) {
    if (dto.chainId) await this.ensureCinemaChain(dto.chainId);
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

  async listCinemaTicketPrices(cinemaId: string) {
    await this.ensureCinema(cinemaId);
    return this.prisma.cinemaTicketPrice.findMany({
      where: { cinemaId },
      orderBy: { seatType: 'asc' },
    });
  }

  async upsertCinemaTicketPrice(cinemaId: string, dto: UpsertCinemaTicketPriceDto) {
    await this.ensureCinema(cinemaId);
    return this.prisma.cinemaTicketPrice.upsert({
      where: {
        cinemaId_seatType: {
          cinemaId,
          seatType: dto.seatType,
        },
      },
      update: {
        price: dto.price,
        isActive: dto.isActive ?? true,
      },
      create: {
        cinemaId,
        seatType: dto.seatType,
        price: dto.price,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async deactivateCinemaTicketPrice(cinemaId: string, seatType: string) {
    await this.ensureCinema(cinemaId);
    return this.prisma.cinemaTicketPrice.update({
      where: {
        cinemaId_seatType: {
          cinemaId,
          seatType: this.parseSeatType(seatType),
        },
      },
      data: { isActive: false },
    });
  }

  listConcessionCombos() {
    return this.prisma.concessionCombo.findMany({
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
    });
  }

  createConcessionCombo(dto: CreateConcessionComboDto) {
    return this.prisma.concessionCombo.create({
      data: {
        ...dto,
        isActive: dto.isActive ?? true,
      },
    });
  }

  updateConcessionCombo(id: string, dto: UpdateConcessionComboDto) {
    return this.prisma.concessionCombo.update({
      where: { id },
      data: dto,
    });
  }

  deleteConcessionCombo(id: string) {
    return this.prisma.concessionCombo.update({
      where: { id },
      data: { isActive: false },
    });
  }

  listRooms() {
    return this.prisma.room.findMany({
      include: {
        cinema: { include: { chain: true } },
        _count: { select: { seats: true, showtimes: true } },
      },
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
      include: { room: { include: { cinema: { include: { chain: true } } } } },
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
      include: {
        movie: true,
        room: { include: { cinema: { include: { chain: true } } } },
        _count: true,
      },
      orderBy: { startAt: 'asc' },
    });
  }

  async createShowtime(dto: CreateShowtimeDto) {
    await this.validateShowtime(dto);
    const { priceBySeatType, basePrice } = await this.getRoomPriceMap(dto.roomId);
    return this.prisma.$transaction(async (tx) => {
      const showtime = await tx.showtime.create({
        data: {
          movieId: dto.movieId,
          roomId: dto.roomId,
          startAt: new Date(dto.startAt),
          endAt: new Date(dto.endAt),
          basePrice,
        },
      });
      const seats = await tx.seat.findMany({ where: { roomId: dto.roomId } });
      await tx.showtimeSeat.createMany({
        data: seats.map((seat) => ({
          showtimeId: showtime.id,
          seatId: seat.id,
          price: priceBySeatType[seat.type],
          status: 'AVAILABLE',
        })),
      });
      await tx.movie.update({
        where: { id: dto.movieId },
        data: { status: MovieStatus.NOW_SHOWING },
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

  private async getRoomPriceMap(roomId: string) {
    const room = await this.prisma.room.findUnique({
      where: { id: roomId },
      include: {
        cinema: true,
        seats: { select: { type: true } },
      },
    });
    if (!room) throw new NotFoundException('Room not found');

    const activePrices = await this.prisma.cinemaTicketPrice.findMany({
      where: { cinemaId: room.cinemaId, isActive: true },
    });
    const priceBySeatType = Object.fromEntries(
      activePrices.map((price) => [price.seatType, Number(price.price)]),
    ) as Record<string, number>;
    const seatTypes = [...new Set(room.seats.map((seat) => seat.type))];
    const missing = seatTypes.filter((seatType) => priceBySeatType[seatType] === undefined);
    if (missing.length) {
      throw new BadRequestException(
        `Cinema ticket price is missing for seat type(s): ${missing.join(', ')}`,
      );
    }

    return {
      priceBySeatType,
      basePrice: priceBySeatType.STANDARD ?? Object.values(priceBySeatType)[0] ?? 0,
    };
  }

  private parseSeatType(value: string) {
    if (!['STANDARD', 'VIP', 'COUPLE'].includes(value)) {
      throw new BadRequestException('Invalid seat type');
    }
    return value as 'STANDARD' | 'VIP' | 'COUPLE';
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

  private async fetchTmdb(path: string, params: Record<string, string | number | boolean> = {}) {
    const apiKey = process.env.TMDB_API_KEY;
    const readAccessToken = process.env.TMDB_READ_ACCESS_TOKEN;

    if (!apiKey && !readAccessToken) {
      throw new BadRequestException('TMDB API key is not configured');
    }

    const url = new URL(`${TMDB_API_URL}${path}`);
    Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, String(value)));
    if (!readAccessToken && apiKey) {
      url.searchParams.set('api_key', apiKey);
    }

    const response = await fetch(url, {
      headers: readAccessToken
        ? { Authorization: `Bearer ${readAccessToken}`, Accept: 'application/json' }
        : { Accept: 'application/json' },
    });

    if (!response.ok) {
      throw new BadRequestException(`TMDB request failed: ${response.status}`);
    }

    return response.json();
  }

  private async fetchTmdbTrailer(tmdbId: number) {
    for (const language of ['vi-VN', 'en-US']) {
      const videos = await this.fetchTmdb(`/movie/${tmdbId}/videos`, { language });
      const trailerUrl = this.pickTmdbTrailer(videos.results || []);
      if (trailerUrl) return trailerUrl;
    }
    return null;
  }

  private pickTmdbTrailer(videos: Array<{ site?: string; key?: string; type?: string; official?: boolean }>) {
    const youtubeVideos = videos.filter((video) => video.site === 'YouTube' && video.key);
    const selected =
      youtubeVideos.find((video) => video.type === 'Trailer' && video.official) ||
      youtubeVideos.find((video) => video.type === 'Trailer') ||
      youtubeVideos.find((video) => video.type === 'Teaser') ||
      youtubeVideos[0];
    return selected ? `https://www.youtube.com/embed/${selected.key}` : null;
  }

  private tmdbImageUrl(path: string | null | undefined, size: string) {
    return path ? `${TMDB_IMAGE_BASE_URL}/${size}${path}` : null;
  }

  private async ensureCinema(id: string) {
    const cinema = await this.prisma.cinema.findUnique({ where: { id } });
    if (!cinema) throw new NotFoundException('Cinema not found');
    return cinema;
  }

  private async ensureCinemaChain(id: string) {
    const chain = await this.prisma.cinemaChain.findUnique({ where: { id } });
    if (!chain) throw new NotFoundException('Cinema chain not found');
    return chain;
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
