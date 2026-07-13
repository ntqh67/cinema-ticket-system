/**
 * Mục đích: Cài đặt nghiệp vụ quản trị; dữ liệu bền vững được truy cập qua Prisma.
 */
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
  RoomAvailableSlotsQueryDto,
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
import { normalizeGenreName } from '../common/genre-map';
import { addMinutes, getVipZone } from '../common/seat-layout';

const CLEANUP_MINUTES = 30;
const SHOWTIME_DAY_OPEN = '08:00';
const SHOWTIME_DAY_CLOSE = '26:00';
const SHOWTIME_LAST_START = '23:45';
const TMDB_API_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE_URL =
  process.env.TMDB_IMAGE_BASE_URL || 'https://image.tmdb.org/t/p';

@Injectable()
// Lớp AdminService tập trung các quy tắc nghiệp vụ và phối hợp truy cập dữ liệu.
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  // Kiểm tra điều kiện nghiệp vụ trong khối listGenres trước khi tiếp tục.
  listGenres() {
    return this.prisma.genre.findMany({ orderBy: { name: 'asc' } });
  }

  // Tạo dữ liệu mới trong khối createGenre và trả về kết quả đã chuẩn hóa.
  createGenre(dto: CreateGenreDto) {
    return this.prisma.genre.create({ data: dto });
  }

  // Cập nhật trạng thái hoặc dữ liệu trong khối updateGenre.
  updateGenre(id: string, dto: UpdateGenreDto) {
    return this.prisma.genre.update({ where: { id }, data: dto });
  }

  // Xử lý việc gỡ bỏ, hủy hoặc giải phóng dữ liệu trong khối deleteGenre.
  deleteGenre(id: string) {
    return this.prisma.genre.delete({ where: { id } });
  }

  // Đọc và lọc dữ liệu cần thiết trong khối getDashboard.
  async getDashboard() {
    const [movies, cinemas, showtimes, users, paidBookings, revenue] =
      await Promise.all([
        this.prisma.movie.count(),
        this.prisma.cinema.count({ where: { city: 'Đà Nẵng' } }),
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

  // Kiểm tra điều kiện nghiệp vụ trong khối listMovies trước khi tiếp tục.
  listMovies() {
    return this.prisma.movie.findMany({
      include: { genres: { include: { genre: true } }, _count: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Tạo dữ liệu mới trong khối createMovie và trả về kết quả đã chuẩn hóa.
  createMovie(dto: CreateMovieDto) {
    return this.prisma.movie.create({
      data: this.movieData(dto),
      include: { genres: { include: { genre: true } } },
    });
  }

  // Tạo dữ liệu mới trong khối createMovieFromTmdb và trả về kết quả đã chuẩn hóa.
  async createMovieFromTmdb(dto: CreateMovieFromTmdbDto) {
    return this.upsertMovieFromTmdb(dto.tmdbId, dto.status || 'NOW_SHOWING');
  }

  // Thực hiện trách nhiệm riêng của khối importUpcomingMoviesFromTmdb.
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

    // Duyệt tập dữ liệu để xử lý từng phần tử theo cùng một quy tắc.
    for (const item of results) {
      movies.push(await this.upsertMovieFromTmdb(item.id, 'COMING_SOON'));
    }

    return {
      importedCount: movies.length,
      movies,
    };
  }

  // Cập nhật trạng thái hoặc dữ liệu trong khối upsertMovieFromTmdb.
  private async upsertMovieFromTmdb(tmdbId: number, status: string) {
    const detailsVi = await this.fetchTmdb(`/movie/${tmdbId}`, {
      language: 'vi-VN',
    });
    const detailsEn =
      detailsVi.title && detailsVi.runtime
        ? detailsVi
        : await this.fetchTmdb(`/movie/${tmdbId}`, { language: 'en-US' });
    const details = {
      ...detailsEn,
      ...Object.fromEntries(
        Object.entries(detailsVi).filter(
          ([, value]) => value !== null && value !== '',
        ),
      ),
    };
    const trailerUrl = await this.fetchTmdbTrailer(tmdbId);
    const existingMovie = await this.prisma.movie.findFirst({
      where: { tmdbId },
    });

    return this.prisma.$transaction(async (tx) => {
      const movieData = {
        tmdbId,
        title: details.title || detailsEn.title,
        description: details.overview || detailsEn.overview || null,
        durationMin: details.runtime || detailsEn.runtime || 100,
        releaseDate: details.release_date
          ? new Date(`${details.release_date}T00:00:00.000Z`)
          : null,
        posterUrl: this.tmdbImageUrl(
          details.poster_path || detailsEn.poster_path,
          'w500',
        ),
        trailerUrl,
        ageRating: 'P',
        status: status as MovieStatus,
      };
      const movie = existingMovie
        ? await tx.movie.update({
            where: { id: existingMovie.id },
            data: movieData,
          })
        : await tx.movie.create({ data: movieData });

      await tx.movieGenre.deleteMany({ where: { movieId: movie.id } });

      // Duyệt tập dữ liệu để xử lý từng phần tử theo cùng một quy tắc.
      for (const genre of details.genres || detailsEn.genres || []) {
        const name = normalizeGenreName(genre.name);
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

  // Cập nhật trạng thái hoặc dữ liệu trong khối updateMovie.
  async updateMovie(id: string, dto: UpdateMovieDto) {
    await this.ensureMovie(id);
    return this.prisma.$transaction(async (tx) => {
      // Đánh giá điều kiện để chọn nhánh xử lý phù hợp và tránh cập nhật sai trạng thái.
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

  // Xử lý việc gỡ bỏ, hủy hoặc giải phóng dữ liệu trong khối deleteMovie.
  deleteMovie(id: string) {
    return this.prisma.movie.delete({ where: { id } });
  }

  // Kiểm tra điều kiện nghiệp vụ trong khối listCinemaChains trước khi tiếp tục.
  listCinemaChains() {
    return this.prisma.cinemaChain.findMany({
      where: { city: 'Đà Nẵng' },
      include: { cinemas: true },
      orderBy: { name: 'asc' },
    });
  }

  // Tạo dữ liệu mới trong khối createCinemaChain và trả về kết quả đã chuẩn hóa.
  createCinemaChain(dto: CreateCinemaChainDto) {
    return this.prisma.cinemaChain.create({
      data: { ...dto, city: dto.city || 'Đà Nẵng' },
    });
  }

  // Cập nhật trạng thái hoặc dữ liệu trong khối updateCinemaChain.
  updateCinemaChain(id: string, dto: UpdateCinemaChainDto) {
    return this.prisma.cinemaChain.update({ where: { id }, data: dto });
  }

  // Xử lý việc gỡ bỏ, hủy hoặc giải phóng dữ liệu trong khối deleteCinemaChain.
  deleteCinemaChain(id: string) {
    return this.prisma.cinemaChain.delete({ where: { id } });
  }

  // Kiểm tra điều kiện nghiệp vụ trong khối listCinemas trước khi tiếp tục.
  listCinemas() {
    return this.prisma.cinema.findMany({
      where: { city: 'Đà Nẵng' },
      include: { chain: true, rooms: true, ticketPrices: true },
      orderBy: [{ code: 'asc' }, { name: 'asc' }],
    });
  }

  // Tạo dữ liệu mới trong khối createCinema và trả về kết quả đã chuẩn hóa.
  async createCinema(dto: CreateCinemaDto) {
    // Đánh giá điều kiện để chọn nhánh xử lý phù hợp và tránh cập nhật sai trạng thái.
    if (dto.chainId) await this.ensureCinemaChain(dto.chainId);
    return this.prisma.cinema.create({
      data: { ...dto, city: dto.city || 'Đà Nẵng' },
    });
  }

  // Cập nhật trạng thái hoặc dữ liệu trong khối updateCinema.
  updateCinema(id: string, dto: UpdateCinemaDto) {
    return this.prisma.cinema.update({ where: { id }, data: dto });
  }

  // Xử lý việc gỡ bỏ, hủy hoặc giải phóng dữ liệu trong khối deleteCinema.
  deleteCinema(id: string) {
    return this.prisma.cinema.delete({ where: { id } });
  }

  // Kiểm tra điều kiện nghiệp vụ trong khối listCinemaTicketPrices trước khi tiếp tục.
  async listCinemaTicketPrices(cinemaId: string) {
    await this.ensureCinema(cinemaId);
    return this.prisma.cinemaTicketPrice.findMany({
      where: { cinemaId },
      orderBy: { seatType: 'asc' },
    });
  }

  // Cập nhật trạng thái hoặc dữ liệu trong khối upsertCinemaTicketPrice.
  async upsertCinemaTicketPrice(
    cinemaId: string,
    dto: UpsertCinemaTicketPriceDto,
  ) {
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

  // Xử lý việc gỡ bỏ, hủy hoặc giải phóng dữ liệu trong khối deactivateCinemaTicketPrice.
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

  // Kiểm tra điều kiện nghiệp vụ trong khối listConcessionCombos trước khi tiếp tục.
  listConcessionCombos() {
    return this.prisma.concessionCombo.findMany({
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
    });
  }

  // Tạo dữ liệu mới trong khối createConcessionCombo và trả về kết quả đã chuẩn hóa.
  createConcessionCombo(dto: CreateConcessionComboDto) {
    return this.prisma.concessionCombo.create({
      data: {
        ...dto,
        isActive: dto.isActive ?? true,
      },
    });
  }

  // Cập nhật trạng thái hoặc dữ liệu trong khối updateConcessionCombo.
  updateConcessionCombo(id: string, dto: UpdateConcessionComboDto) {
    return this.prisma.concessionCombo.update({
      where: { id },
      data: dto,
    });
  }

  // Xử lý việc gỡ bỏ, hủy hoặc giải phóng dữ liệu trong khối deleteConcessionCombo.
  deleteConcessionCombo(id: string) {
    return this.prisma.concessionCombo.update({
      where: { id },
      data: { isActive: false },
    });
  }

  // Kiểm tra điều kiện nghiệp vụ trong khối listRooms trước khi tiếp tục.
  async listRooms() {
    const rooms = await this.prisma.room.findMany({
      include: {
        cinema: { include: { chain: true } },
        seats: true,
        _count: { select: { seats: true, showtimes: true } },
      },
      orderBy: [{ cinemaId: 'asc' }, { name: 'asc' }],
    });

    return rooms.map((room) => {
      const rowLabels = [...new Set(room.seats.map((seat) => seat.row))].sort();
      const cols = room.seats.reduce(
        (max, seat) => Math.max(max, seat.number),
        0,
      );
      const seatTypeSummary = room.seats.reduce(
        (summary, seat) => {
          summary[seat.type] = (summary[seat.type] || 0) + 1;
          return summary;
        },
        {} as Record<string, number>,
      );

      return {
        id: room.id,
        cinemaId: room.cinemaId,
        cinema: room.cinema,
        name: room.name,
        capacity: room._count.seats,
        rows: rowLabels.length,
        cols,
        seatCount: room._count.seats,
        showtimeCount: room._count.showtimes,
        seatTypeSummary,
        createdAt: room.createdAt,
        updatedAt: room.updatedAt,
      };
    });
  }

  // Tạo dữ liệu mới trong khối createRoom và trả về kết quả đã chuẩn hóa.
  async createRoom(dto: CreateRoomDto) {
    await this.ensureCinema(dto.cinemaId);
    return this.prisma.room.create({
      data: { cinemaId: dto.cinemaId, name: dto.name, capacity: 0 },
    });
  }

  // Cập nhật trạng thái hoặc dữ liệu trong khối updateRoom.
  async updateRoom(id: string, dto: UpdateRoomDto) {
    await this.ensureRoom(id);
    const seatCount = await this.prisma.seat.count({ where: { roomId: id } });
    return this.prisma.room.update({
      where: { id },
      data: { name: dto.name, capacity: seatCount },
    });
  }

  // Xử lý việc gỡ bỏ, hủy hoặc giải phóng dữ liệu trong khối deleteRoom.
  deleteRoom(id: string) {
    return this.prisma.room.delete({ where: { id } });
  }

  // Kiểm tra điều kiện nghiệp vụ trong khối listSeats trước khi tiếp tục.
  listSeats() {
    return this.prisma.seat.findMany({
      include: { room: { include: { cinema: { include: { chain: true } } } } },
      orderBy: [{ roomId: 'asc' }, { row: 'asc' }, { number: 'asc' }],
    });
  }

  // Tạo dữ liệu mới trong khối createSeat và trả về kết quả đã chuẩn hóa.
  async createSeat(dto: CreateSeatDto) {
    await this.ensureRoom(dto.roomId);
    return this.prisma.$transaction(async (tx) => {
      const seat = await tx.seat.create({
        data: {
          ...dto,
          position: dto.position || dto.number,
          type: dto.type || 'STANDARD',
        },
      });
      const capacity = await tx.seat.count({ where: { roomId: dto.roomId } });
      await tx.room.update({ where: { id: dto.roomId }, data: { capacity } });
      return seat;
    });
  }

  // Cập nhật trạng thái hoặc dữ liệu trong khối updateSeat.
  updateSeat(id: string, dto: UpdateSeatDto) {
    return this.prisma.seat.update({ where: { id }, data: dto });
  }

  // Xử lý việc gỡ bỏ, hủy hoặc giải phóng dữ liệu trong khối deleteSeat.
  async deleteSeat(id: string) {
    const seat = await this.prisma.seat.findUnique({
      where: { id },
      select: { roomId: true },
    });
    // Kiểm tra trạng thái và ràng buộc ghế trước khi thay đổi booking.
    if (!seat) throw new NotFoundException('Seat not found');
    return this.prisma.$transaction(async (tx) => {
      const deleted = await tx.seat.delete({ where: { id } });
      const capacity = await tx.seat.count({ where: { roomId: seat.roomId } });
      await tx.room.update({ where: { id: seat.roomId }, data: { capacity } });
      return deleted;
    });
  }

  // Tạo dữ liệu mới trong khối generateSeats và trả về kết quả đã chuẩn hóa.
  async generateSeats(roomId: string, dto: GenerateSeatsDto) {
    const room = await this.ensureRoom(roomId);
    const coupleRows = new Set(dto.coupleRows || []);
    const vipZone = getVipZone(dto.rows, dto.columns);
    const seats: Prisma.SeatCreateManyInput[] = [];

    // Duyệt tập dữ liệu để xử lý từng phần tử theo cùng một quy tắc.
    for (const row of dto.rows) {
      const isCoupleRow = coupleRows.has(row);
      const seatCount = isCoupleRow ? Math.floor(dto.columns / 2) : dto.columns;
      // Duyệt tập dữ liệu để xử lý từng phần tử theo cùng một quy tắc.
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
          position: isCoupleRow ? (number - 1) * 2 + 1 : number,
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

  // Kiểm tra điều kiện nghiệp vụ trong khối listShowtimes trước khi tiếp tục.
  async listShowtimes() {
    const showtimes = await this.prisma.showtime.findMany({
      include: {
        movie: true,
        room: { include: { cinema: { include: { chain: true } } } },
        showtimeSeats: {
          select: {
            status: true,
            price: true,
            seat: { select: { type: true } },
          },
        },
        _count: true,
      },
      orderBy: { startAt: 'asc' },
    });

    return showtimes.map((showtime) => {
      const totalSeats = showtime.showtimeSeats.length;
      const bookedSeats = showtime.showtimeSeats.filter(
        (seat) => seat.status === 'BOOKED',
      ).length;
      const priceBySeatType = showtime.showtimeSeats.reduce(
        (prices, showtimeSeat) => {
          const seatType = showtimeSeat.seat.type;
          const price = Number(showtimeSeat.price);
          // Kiểm tra trạng thái và ràng buộc ghế trước khi thay đổi booking.
          if (prices[seatType] === undefined || price < prices[seatType]) {
            prices[seatType] = price;
          }
          return prices;
        },
        {} as Record<string, number>,
      );

      return {
        id: showtime.id,
        movieId: showtime.movieId,
        roomId: showtime.roomId,
        cinemaId: showtime.room.cinema.id,
        chainId: showtime.room.cinema.chainId || showtime.room.cinema.id,
        movie: showtime.movie,
        room: showtime.room,
        cinema: showtime.room.cinema,
        chain: showtime.room.cinema.chain,
        startAt: showtime.startAt,
        endAt: showtime.endAt,
        basePrice: Number(showtime.basePrice),
        price: {
          normal: priceBySeatType.STANDARD ?? Number(showtime.basePrice),
          vip:
            priceBySeatType.VIP ??
            priceBySeatType.STANDARD ??
            Number(showtime.basePrice),
          couple:
            priceBySeatType.COUPLE ??
            priceBySeatType.STANDARD ??
            Number(showtime.basePrice),
        },
        totalSeats,
        bookedSeats,
        seatBookedPercent: totalSeats
          ? Math.round((bookedSeats / totalSeats) * 100)
          : 0,
        createdAt: showtime.createdAt,
        updatedAt: showtime.updatedAt,
      };
    });
  }

  // Tạo dữ liệu mới trong khối createShowtime và trả về kết quả đã chuẩn hóa.
  async createShowtime(dto: CreateShowtimeDto) {
    await this.validateShowtime(dto);
    const { priceBySeatType, basePrice } = await this.getRoomPriceMap(
      dto.roomId,
    );
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

  // Cập nhật trạng thái hoặc dữ liệu trong khối updateShowtime.
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

  // Xử lý việc gỡ bỏ, hủy hoặc giải phóng dữ liệu trong khối deleteShowtime.
  deleteShowtime(id: string) {
    return this.prisma.showtime.delete({ where: { id } });
  }

  // Đọc và lọc dữ liệu cần thiết trong khối getRoomAvailableSlots.
  async getRoomAvailableSlots(
    roomId: string,
    query: RoomAvailableSlotsQueryDto,
  ) {
    const [room, movie] = await Promise.all([
      this.prisma.room.findUnique({
        where: { id: roomId },
        include: { cinema: true },
      }),
      this.prisma.movie.findUnique({ where: { id: query.movieId } }),
    ]);

    // Chặn luồng hiện tại khi dữ liệu hoặc điều kiện bắt buộc chưa được đáp ứng.
    if (!room) throw new NotFoundException('Room not found');
    // Chặn luồng hiện tại khi dữ liệu hoặc điều kiện bắt buộc chưa được đáp ứng.
    if (!movie) throw new NotFoundException('Movie not found');

    const windowStart = this.dateTimeInDaNang(query.date, SHOWTIME_DAY_OPEN);
    const windowEnd = this.dateTimeInDaNang(query.date, SHOWTIME_DAY_CLOSE);
    const durationMinutes = movie.durationMin;
    const requiredMinutes = durationMinutes;

    const showtimes = await this.prisma.showtime.findMany({
      where: {
        roomId,
        startAt: { lt: windowEnd },
        endAt: { gt: windowStart },
      },
      include: {
        movie: { select: { id: true, title: true, durationMin: true } },
      },
      orderBy: { startAt: 'asc' },
    });

    const occupied = showtimes.map((showtime) => ({
      id: showtime.id,
      movieId: showtime.movieId,
      movieTitle: showtime.movie.title,
      startAt: showtime.startAt,
      endAt: showtime.endAt,
      cleanupEndAt: addMinutes(showtime.endAt, CLEANUP_MINUTES),
    }));

    const availableSlots: Array<{
      startAt: Date;
      endAt: Date;
      latestStartAt: Date;
      durationMinutes: number;
    }> = [];

    let cursor = windowStart;
    // Duyệt tập dữ liệu để xử lý từng phần tử theo cùng một quy tắc.
    for (const item of occupied) {
      const nextShowtimeStartWithCleanup = addMinutes(
        item.startAt,
        -CLEANUP_MINUTES,
      );
      const slotEnd =
        nextShowtimeStartWithCleanup < windowEnd
          ? nextShowtimeStartWithCleanup
          : windowEnd;
      const slotMinutes = this.minutesBetween(cursor, slotEnd);
      // Đánh giá điều kiện để chọn nhánh xử lý phù hợp và tránh cập nhật sai trạng thái.
      if (slotMinutes >= requiredMinutes) {
        availableSlots.push({
          startAt: cursor,
          endAt: slotEnd,
          latestStartAt: addMinutes(slotEnd, -requiredMinutes),
          durationMinutes: slotMinutes,
        });
      }
      const cleanupEndAt =
        item.cleanupEndAt > windowStart ? item.cleanupEndAt : windowStart;
      // Đánh giá điều kiện để chọn nhánh xử lý phù hợp và tránh cập nhật sai trạng thái.
      if (cleanupEndAt > cursor) cursor = cleanupEndAt;
    }

    const tailMinutes = this.minutesBetween(cursor, windowEnd);
    // Đánh giá điều kiện để chọn nhánh xử lý phù hợp và tránh cập nhật sai trạng thái.
    if (tailMinutes >= requiredMinutes) {
      availableSlots.push({
        startAt: cursor,
        endAt: windowEnd,
        latestStartAt: addMinutes(windowEnd, -requiredMinutes),
        durationMinutes: tailMinutes,
      });
    }

    const latestStartBoundary = this.dateTimeInDaNang(
      query.date,
      SHOWTIME_LAST_START,
    );
    const suggestedStartTimes = availableSlots.flatMap((slot) => {
      const latestStartAt =
        slot.latestStartAt < latestStartBoundary
          ? slot.latestStartAt
          : latestStartBoundary;
      return latestStartAt >= slot.startAt
        ? this.suggestStartTimes(slot.startAt, latestStartAt, 15)
        : [];
    });

    return {
      roomId,
      roomName: room.name,
      cinemaId: room.cinemaId,
      cinemaName: room.cinema.name,
      movieId: movie.id,
      movieTitle: movie.title,
      date: query.date,
      movieDurationMin: durationMinutes,
      cleanupMinutes: CLEANUP_MINUTES,
      windowStartAt: windowStart,
      windowEndAt: windowEnd,
      occupied,
      availableSlots,
      suggestedStartTimes,
    };
  }

  // Thực hiện trách nhiệm riêng của khối movieData.
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

  // Kiểm tra điều kiện nghiệp vụ trong khối validateShowtime trước khi tiếp tục.
  private async validateShowtime(dto: CreateShowtimeDto, ignoreId?: string) {
    const startAt = new Date(dto.startAt);
    const endAt = new Date(dto.endAt);
    // Đánh giá điều kiện để chọn nhánh xử lý phù hợp và tránh cập nhật sai trạng thái.
    if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
      throw new BadRequestException('Invalid showtime date');
    }
    // Đánh giá điều kiện để chọn nhánh xử lý phù hợp và tránh cập nhật sai trạng thái.
    if (startAt >= endAt) {
      throw new BadRequestException('Showtime startAt must be before endAt');
    }

    const [movie, room] = await Promise.all([
      this.prisma.movie.findUnique({ where: { id: dto.movieId } }),
      this.prisma.room.findUnique({ where: { id: dto.roomId } }),
    ]);
    if (!movie) throw new NotFoundException('Movie not found');
    if (!room) throw new NotFoundException('Room not found');
    // Rẽ nhánh theo trạng thái hiện tại để chỉ cho phép luồng nghiệp vụ hợp lệ.
    if (movie.status === 'DRAFT' || movie.status === 'ENDED') {
      throw new BadRequestException('Movie must be available for scheduling');
    }

    const conflict = await this.prisma.showtime.findFirst({
      where: {
        id: ignoreId ? { not: ignoreId } : undefined,
        roomId: dto.roomId,
        startAt: { lt: addMinutes(endAt, CLEANUP_MINUTES) },
        endAt: { gt: addMinutes(startAt, -CLEANUP_MINUTES) },
      },
    });

    // Đánh giá điều kiện để chọn nhánh xử lý phù hợp và tránh cập nhật sai trạng thái.
    if (conflict) {
      throw new ConflictException(
        'Showtime overlaps this room or violates 30-minute cleanup time',
      );
    }
  }

  // Đọc và lọc dữ liệu cần thiết trong khối getRoomPriceMap.
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
    const missing = seatTypes.filter(
      (seatType) => priceBySeatType[seatType] === undefined,
    );
    // Kiểm tra số lượng phần tử để xử lý trường hợp rỗng hoặc vượt giới hạn.
    if (missing.length) {
      throw new BadRequestException(
        `Cinema ticket price is missing for seat type(s): ${missing.join(', ')}`,
      );
    }

    return {
      priceBySeatType,
      basePrice:
        priceBySeatType.STANDARD ?? Object.values(priceBySeatType)[0] ?? 0,
    };
  }

  // Chuẩn hóa dữ liệu đầu vào/đầu ra trong khối parseSeatType.
  private parseSeatType(value: string) {
    // Chặn luồng hiện tại khi dữ liệu hoặc điều kiện bắt buộc chưa được đáp ứng.
    if (!['STANDARD', 'VIP', 'COUPLE'].includes(value)) {
      throw new BadRequestException('Invalid seat type');
    }
    return value as 'STANDARD' | 'VIP' | 'COUPLE';
  }

  // Thực hiện trách nhiệm riêng của khối minutesBetween.
  private minutesBetween(startAt: Date, endAt: Date) {
    return Math.floor((endAt.getTime() - startAt.getTime()) / 60000);
  }

  // Chuẩn hóa dữ liệu đầu vào/đầu ra trong khối dateTimeInDaNang.
  private dateTimeInDaNang(date: string, time: string) {
    const [hourRaw, minuteRaw] = time.split(':').map(Number);
    const hour = Number.isFinite(hourRaw) ? hourRaw : 0;
    const minute = Number.isFinite(minuteRaw) ? minuteRaw : 0;
    const dayOffset = Math.floor(hour / 24);
    const hourInDay = hour % 24;
    const result = new Date(
      `${date}T${String(hourInDay).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00.000+07:00`,
    );
    result.setUTCDate(result.getUTCDate() + dayOffset);
    return result;
  }

  // Chuẩn hóa dữ liệu đầu vào/đầu ra trong khối suggestStartTimes.
  private suggestStartTimes(
    startAt: Date,
    latestStartAt: Date,
    stepMinutes: number,
  ) {
    const times: Array<{ value: string; label: string; startAt: Date }> = [];
    let cursor = new Date(startAt);

    while (cursor <= latestStartAt) {
      times.push({
        value: this.formatTimeValue(cursor),
        label: cursor.toLocaleTimeString('vi-VN', {
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'Asia/Bangkok',
        }),
        startAt: new Date(cursor),
      });
      cursor = addMinutes(cursor, stepMinutes);
    }

    return times;
  }

  // Chuẩn hóa dữ liệu đầu vào/đầu ra trong khối formatTimeValue.
  private formatTimeValue(date: Date) {
    const parts = new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'Asia/Bangkok',
    }).formatToParts(date);
    const hour = parts.find((part) => part.type === 'hour')?.value || '00';
    const minute = parts.find((part) => part.type === 'minute')?.value || '00';
    return `${hour}:${minute}`;
  }

  // Đọc và lọc dữ liệu cần thiết trong khối fetchTmdb.
  private async fetchTmdb(
    path: string,
    params: Record<string, string | number | boolean> = {},
  ) {
    const apiKey = process.env.TMDB_API_KEY;
    const readAccessToken = process.env.TMDB_READ_ACCESS_TOKEN;

    // Chặn luồng hiện tại khi dữ liệu hoặc điều kiện bắt buộc chưa được đáp ứng.
    if (!apiKey && !readAccessToken) {
      throw new BadRequestException('TMDB API key is not configured');
    }

    const url = new URL(`${TMDB_API_URL}${path}`);
    Object.entries(params).forEach(([key, value]) =>
      url.searchParams.set(key, String(value)),
    );
    // Chặn luồng hiện tại khi dữ liệu hoặc điều kiện bắt buộc chưa được đáp ứng.
    if (!readAccessToken && apiKey) {
      url.searchParams.set('api_key', apiKey);
    }

    const response = await fetch(url, {
      headers: readAccessToken
        ? {
            Authorization: `Bearer ${readAccessToken}`,
            Accept: 'application/json',
          }
        : { Accept: 'application/json' },
    });

    // Kiểm tra kết quả thao tác và chuyển sang nhánh lỗi khi cần.
    if (!response.ok) {
      throw new BadRequestException(`TMDB request failed: ${response.status}`);
    }

    return response.json();
  }

  // Đọc và lọc dữ liệu cần thiết trong khối fetchTmdbTrailer.
  private async fetchTmdbTrailer(tmdbId: number) {
    // Duyệt tập dữ liệu để xử lý từng phần tử theo cùng một quy tắc.
    for (const language of ['vi-VN', 'en-US']) {
      const videos = await this.fetchTmdb(`/movie/${tmdbId}/videos`, {
        language,
      });
      const trailerUrl = this.pickTmdbTrailer(videos.results || []);
      // Đánh giá điều kiện để chọn nhánh xử lý phù hợp và tránh cập nhật sai trạng thái.
      if (trailerUrl) return trailerUrl;
    }
    return null;
  }

  // Thực hiện trách nhiệm riêng của khối pickTmdbTrailer.
  private pickTmdbTrailer(
    videos: Array<{
      site?: string;
      key?: string;
      type?: string;
      official?: boolean;
    }>,
  ) {
    const youtubeVideos = videos.filter(
      (video) => video.site === 'YouTube' && video.key,
    );
    const selected =
      youtubeVideos.find(
        (video) => video.type === 'Trailer' && video.official,
      ) ||
      youtubeVideos.find((video) => video.type === 'Trailer') ||
      youtubeVideos.find((video) => video.type === 'Teaser') ||
      youtubeVideos[0];
    return selected ? `https://www.youtube.com/embed/${selected.key}` : null;
  }

  // Thực hiện trách nhiệm riêng của khối tmdbImageUrl.
  private tmdbImageUrl(path: string | null | undefined, size: string) {
    return path ? `${TMDB_IMAGE_BASE_URL}/${size}${path}` : null;
  }

  // Kiểm tra điều kiện nghiệp vụ trong khối ensureCinema trước khi tiếp tục.
  private async ensureCinema(id: string) {
    const cinema = await this.prisma.cinema.findUnique({ where: { id } });
    // Chặn luồng hiện tại khi dữ liệu hoặc điều kiện bắt buộc chưa được đáp ứng.
    if (!cinema) throw new NotFoundException('Cinema not found');
    return cinema;
  }

  // Kiểm tra điều kiện nghiệp vụ trong khối ensureCinemaChain trước khi tiếp tục.
  private async ensureCinemaChain(id: string) {
    const chain = await this.prisma.cinemaChain.findUnique({ where: { id } });
    // Chặn luồng hiện tại khi dữ liệu hoặc điều kiện bắt buộc chưa được đáp ứng.
    if (!chain) throw new NotFoundException('Cinema chain not found');
    return chain;
  }

  // Kiểm tra điều kiện nghiệp vụ trong khối ensureRoom trước khi tiếp tục.
  private async ensureRoom(id: string) {
    const room = await this.prisma.room.findUnique({ where: { id } });
    if (!room) throw new NotFoundException('Room not found');
    return room;
  }

  // Kiểm tra điều kiện nghiệp vụ trong khối ensureMovie trước khi tiếp tục.
  private async ensureMovie(id: string) {
    const movie = await this.prisma.movie.findUnique({ where: { id } });
    if (!movie) throw new NotFoundException('Movie not found');
    return movie;
  }

  // Kiểm tra điều kiện nghiệp vụ trong khối ensureShowtime trước khi tiếp tục.
  private async ensureShowtime(id: string) {
    const showtime = await this.prisma.showtime.findUnique({ where: { id } });
    // Chặn luồng hiện tại khi dữ liệu hoặc điều kiện bắt buộc chưa được đáp ứng.
    if (!showtime) throw new NotFoundException('Showtime not found');
    return showtime;
  }
}
