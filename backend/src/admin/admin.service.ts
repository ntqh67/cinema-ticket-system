import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PaymentStatus, MovieStatus, Prisma, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateCinemaDto,
  CreateConcessionComboDto,
  CreateCinemaChainDto,
  CreateGenreDto,
  CreateMovieFromTmdbDto,
  CreateMovieDto,
  RoomAvailableSlotsQueryDto,
  CreateRoomDto,
  CreateSeatDto,
  CreateShowtimeDto,
  CreateStaffDto,
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
import { formatDateInDaNang } from '../common/danang-date';
import { MovieStatusService } from '../movies/movie-status.service';
import { ticketPriceForRole } from '../common/ticket-discount';
import { calculateStaffPay } from '../common/staff-pay';
import { resolveStaffAttendanceStatus } from '../common/staff-shifts';

const CLEANUP_MINUTES = 30;
const SHOWTIME_DAY_OPEN = '08:00';
const SHOWTIME_DAY_CLOSE = '26:00';
const SHOWTIME_LAST_START = '23:45';
const TMDB_API_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE_URL =
  process.env.TMDB_IMAGE_BASE_URL || 'https://image.tmdb.org/t/p';
const ADMIN_ROOM_INCLUDE = {
  cinema: { include: { chain: true } },
  seats: true,
  _count: { select: { seats: true, showtimes: true } },
} satisfies Prisma.RoomInclude;
type AdminRoomWithDetails = Prisma.RoomGetPayload<{
  include: typeof ADMIN_ROOM_INCLUDE;
}>;
const DASHBOARD_SHOWTIME_INCLUDE = {
  movie: { select: { id: true, title: true, posterUrl: true } },
  room: {
    select: {
      id: true,
      name: true,
      cinema: { select: { id: true, name: true } },
    },
  },
  showtimeSeats: { select: { status: true } },
} satisfies Prisma.ShowtimeInclude;
type DashboardShowtime = Prisma.ShowtimeGetPayload<{
  include: typeof DASHBOARD_SHOWTIME_INCLUDE;
}>;
type StaffAttendanceRow = {
  id: string;
  workDate: Date;
  checkInAt: Date | null;
  checkOutAt: Date | null;
  shiftCode: string | null;
  status: 'PRESENT' | 'LATE' | 'ABSENT' | 'LEAVE';
  note: string | null;
};

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly movieStatusService: MovieStatusService,
  ) {}

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
    await this.movieStatusService.synchronizeStatuses();
    const now = new Date();
    const today = formatDateInDaNang(now);
    const todayStart = new Date(`${today}T00:00:00.000+07:00`);
    const tomorrowStart = this.addMinutes(todayStart, 24 * 60);
    const trendStart = this.addMinutes(todayStart, -7 * 24 * 60);
    const [year, month] = today.split('-').map(Number);
    const monthStart = new Date(
      `${year}-${String(month).padStart(2, '0')}-01T00:00:00.000+07:00`,
    );
    const nextMonthStart = new Date(
      `${month === 12 ? year + 1 : year}-${String((month % 12) + 1).padStart(2, '0')}-01T00:00:00.000+07:00`,
    );

    const [
      movies,
      cinemas,
      showtimes,
      users,
      paidBookings,
      revenue,
      nowShowingMovies,
      rooms,
      seats,
      todayShowtimeCount,
      activeShowtimeCount,
      todaySchedules,
      trendPayments,
      monthShowtimes,
    ] =
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
        this.prisma.movie.count({ where: { status: MovieStatus.NOW_SHOWING } }),
        this.prisma.room.count({ where: { cinema: { city: 'Đà Nẵng' } } }),
        this.prisma.seat.count({ where: { room: { cinema: { city: 'Đà Nẵng' } } } }),
        this.prisma.showtime.count({
          where: { startAt: { gte: todayStart, lt: tomorrowStart } },
        }),
        this.prisma.showtime.count({
          where: { startAt: { lte: now }, endAt: { gt: now } },
        }),
        this.prisma.showtime.findMany({
          where: { startAt: { gte: todayStart, lt: tomorrowStart } },
          orderBy: { startAt: 'asc' },
          take: 20,
          include: DASHBOARD_SHOWTIME_INCLUDE,
        }),
        this.prisma.payment.findMany({
          where: {
            status: PaymentStatus.SUCCESS,
            OR: [
              { paidAt: { gte: trendStart } },
              { paidAt: null, createdAt: { gte: trendStart } },
            ],
          },
          select: { amount: true, paidAt: true, createdAt: true },
        }),
        this.prisma.showtime.findMany({
          where: { startAt: { gte: monthStart, lt: nextMonthStart } },
          select: { startAt: true },
        }),
      ]);

    const revenueTotals = new Map<string, { revenue: number; invoices: number }>();
    trendPayments.forEach((payment) => {
      const date = formatDateInDaNang(payment.paidAt || payment.createdAt);
      const current = revenueTotals.get(date) || { revenue: 0, invoices: 0 };
      current.revenue += Number(payment.amount);
      current.invoices += 1;
      revenueTotals.set(date, current);
    });
    const revenueByDate = Array.from({ length: 15 }, (_, index) => {
      const dateValue = this.addMinutes(trendStart, index * 24 * 60);
      const date = formatDateInDaNang(dateValue);
      return { date, ...(revenueTotals.get(date) || { revenue: 0, invoices: 0 }) };
    });
    const todayFinance = revenueTotals.get(today) || { revenue: 0, invoices: 0 };

    return {
      movies,
      cinemas,
      showtimes,
      users,
      bookings: paidBookings,
      revenue: Number(revenue._sum.amount || 0),
      currency: 'VND',
      nowShowingMovies,
      rooms,
      seats,
      todayShowtimes: todayShowtimeCount,
      activeShowtimes: activeShowtimeCount,
      todayRevenue: todayFinance.revenue,
      todayPaidInvoices: todayFinance.invoices,
      revenueByDate,
      showtimeDates: [
        ...new Set(monthShowtimes.map((showtime) => formatDateInDaNang(showtime.startAt))),
      ],
      todaySchedules: todaySchedules.map((showtime) =>
        this.dashboardShowtimeData(showtime),
      ),
      date: today,
    };
  }

  async getDashboardShowtimes(date: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) {
      throw new BadRequestException('Ngày chiếu không hợp lệ');
    }
    const startAt = new Date(`${date}T00:00:00.000+07:00`);
    if (Number.isNaN(startAt.getTime())) {
      throw new BadRequestException('Ngày chiếu không hợp lệ');
    }
    const endAt = this.addMinutes(startAt, 24 * 60);
    const showtimes = await this.prisma.showtime.findMany({
      where: { startAt: { gte: startAt, lt: endAt } },
      orderBy: { startAt: 'asc' },
      include: DASHBOARD_SHOWTIME_INCLUDE,
    });
    return {
      date,
      count: showtimes.length,
      showtimes: showtimes.map((showtime) =>
        this.dashboardShowtimeData(showtime),
      ),
    };
  }

  async getRevenueReport(daysValue?: string) {
    const days = Number(daysValue || 30);
    if (![7, 30, 90, 365].includes(days)) {
      throw new BadRequestException('Khoảng thời gian doanh thu không hợp lệ');
    }
    const today = formatDateInDaNang(new Date());
    const todayStart = new Date(`${today}T00:00:00.000+07:00`);
    const periodEnd = this.addMinutes(todayStart, 24 * 60);
    const periodStart = this.addMinutes(todayStart, -(days - 1) * 24 * 60);
    const previousStart = this.addMinutes(periodStart, -days * 24 * 60);
    const paymentInclude = {
      booking: {
        include: {
          user: { select: { firstName: true, lastName: true, email: true } },
          bookingItems: { select: { id: true } },
          showtime: {
            include: {
              movie: { select: { id: true, title: true, posterUrl: true } },
              room: {
                include: {
                  cinema: { select: { id: true, name: true } },
                },
              },
            },
          },
        },
      },
    } satisfies Prisma.PaymentInclude;
    const paymentWhere = (start: Date, end: Date) => ({
      status: PaymentStatus.SUCCESS,
      OR: [
        { paidAt: { gte: start, lt: end } },
        { paidAt: null, createdAt: { gte: start, lt: end } },
      ],
    }) satisfies Prisma.PaymentWhereInput;

    const [payments, previousPayments] = await Promise.all([
      this.prisma.payment.findMany({
        where: paymentWhere(periodStart, periodEnd),
        include: paymentInclude,
        orderBy: [{ paidAt: 'desc' }, { createdAt: 'desc' }],
      }),
      this.prisma.payment.findMany({
        where: paymentWhere(previousStart, periodStart),
        select: { amount: true },
      }),
    ]);

    const revenue = payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
    const previousRevenue = previousPayments.reduce(
      (sum, payment) => sum + Number(payment.amount),
      0,
    );
    const tickets = payments.reduce(
      (sum, payment) => sum + payment.booking.bookingItems.length,
      0,
    );
    const dailyTotals = new Map<string, { revenue: number; invoices: number; tickets: number }>();
    const movieTotals = new Map<string, { id: string; name: string; posterUrl: string | null; revenue: number; invoices: number; tickets: number }>();
    const cinemaTotals = new Map<string, { id: string; name: string; revenue: number; invoices: number }>();

    payments.forEach((payment) => {
      const amount = Number(payment.amount);
      const paidAt = payment.paidAt || payment.createdAt;
      const date = formatDateInDaNang(paidAt);
      const daily = dailyTotals.get(date) || { revenue: 0, invoices: 0, tickets: 0 };
      daily.revenue += amount;
      daily.invoices += 1;
      daily.tickets += payment.booking.bookingItems.length;
      dailyTotals.set(date, daily);

      const movie = payment.booking.showtime.movie;
      const movieTotal = movieTotals.get(movie.id) || {
        id: movie.id,
        name: movie.title,
        posterUrl: movie.posterUrl,
        revenue: 0,
        invoices: 0,
        tickets: 0,
      };
      movieTotal.revenue += amount;
      movieTotal.invoices += 1;
      movieTotal.tickets += payment.booking.bookingItems.length;
      movieTotals.set(movie.id, movieTotal);

      const cinema = payment.booking.showtime.room.cinema;
      const cinemaTotal = cinemaTotals.get(cinema.id) || {
        id: cinema.id,
        name: cinema.name,
        revenue: 0,
        invoices: 0,
      };
      cinemaTotal.revenue += amount;
      cinemaTotal.invoices += 1;
      cinemaTotals.set(cinema.id, cinemaTotal);
    });

    const daily = Array.from({ length: days }, (_, index) => {
      const date = formatDateInDaNang(
        this.addMinutes(periodStart, index * 24 * 60),
      );
      return { date, ...(dailyTotals.get(date) || { revenue: 0, invoices: 0, tickets: 0 }) };
    });
    return {
      period: { days, from: formatDateInDaNang(periodStart), to: today },
      summary: {
        revenue,
        previousRevenue,
        growthPercent:
          previousRevenue > 0
            ? ((revenue - previousRevenue) / previousRevenue) * 100
            : revenue > 0
              ? 100
              : 0,
        invoices: payments.length,
        tickets,
        averageInvoice: payments.length ? revenue / payments.length : 0,
      },
      daily,
      topMovies: [...movieTotals.values()]
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5),
      topCinemas: [...cinemaTotals.values()]
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5),
      recentTransactions: payments.slice(0, 8).map((payment) => ({
        id: payment.id,
        bookingId: payment.bookingId,
        amount: Number(payment.amount),
        paidAt: payment.paidAt || payment.createdAt,
        provider: payment.provider,
        customer:
          [payment.booking.user.firstName, payment.booking.user.lastName]
            .filter(Boolean)
            .join(' ') || payment.booking.user.email,
        movie: payment.booking.showtime.movie.title,
        cinema: payment.booking.showtime.room.cinema.name,
        tickets: payment.booking.bookingItems.length,
      })),
    };
  }

  async listUsers(role?: string) {
    const selectedRole = role?.toUpperCase();
    if (selectedRole && !['CUSTOMER', 'STAFF', 'ADMIN'].includes(selectedRole)) {
      throw new BadRequestException('Vai trò người dùng không hợp lệ');
    }
    const users = await this.prisma.user.findMany({
      where: selectedRole ? { role: selectedRole as Role } : undefined,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        username: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        createdAt: true,
        _count: { select: { bookings: true } },
      },
    });
    return users.map((user) => ({
      id: user.id,
      username: user.username,
      email: user.email,
      name:
        [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email,
      phone: user.phone || '',
      role: user.role,
      bookingCount: user._count.bookings,
      createdAt: user.createdAt,
    }));
  }

  async createStaff(dto: CreateStaffDto) {
    const email = dto.email.trim().toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing?.role === Role.ADMIN) {
      throw new ConflictException('Không thể chuyển tài khoản Admin thành nhân viên');
    }
    if (existing?.role === Role.STAFF) {
      throw new ConflictException('Email này đã là tài khoản nhân viên');
    }

    const { firstName, lastName } = this.splitPersonName(dto.name);
    const passwordHash = existing?.passwordHash || (await bcrypt.hash(dto.password, 10));
    const staff = existing
      ? await this.prisma.user.update({
          where: { id: existing.id },
          data: {
            firstName,
            lastName,
            phone: dto.phone?.trim() || existing.phone,
            role: Role.STAFF,
            isActive: true,
          },
        })
      : await this.prisma.user.create({
          data: {
            email,
            firstName,
            lastName,
            phone: dto.phone?.trim() || null,
            passwordHash,
            role: Role.STAFF,
          },
        });

    return this.publicStaff(staff);
  }

  async getStaffDetail(id: string) {
    const staff = await this.prisma.user.findFirst({
      where: { id, role: Role.STAFF },
      include: {
        _count: { select: { bookings: true } },
      },
    });
    if (!staff) throw new NotFoundException('Không tìm thấy nhân viên');

    const attendances = await this.prisma.$queryRaw<StaffAttendanceRow[]>(
      Prisma.sql`SELECT "id", "workDate", "checkInAt", "checkOutAt", "shiftCode", "status", "note"
                 FROM "staff_attendances"
                 WHERE "staffId" = ${id}
                 ORDER BY "workDate" DESC
                 LIMIT 370`,
    );

    const attendanceData = attendances.map((item) => {
      const workDate = formatDateInDaNang(item.workDate);
      return {
        id: item.id,
        workDate,
        checkInAt: item.checkInAt,
        checkOutAt: item.checkOutAt,
        shiftCode: item.shiftCode,
        status: resolveStaffAttendanceStatus(
          workDate,
          item.checkInAt,
          item.shiftCode,
          item.status,
        ),
        note: item.note || '',
        pay: calculateStaffPay(item.checkInAt, item.checkOutAt),
      };
    });
    const attendanceSummary = attendanceData.reduce(
      (summary, item) => {
        summary[item.status] += 1;
        return summary;
      },
      { PRESENT: 0, LATE: 0, ABSENT: 0, LEAVE: 0 },
    );
    return {
      ...this.publicStaff(staff),
      bookingCount: staff._count.bookings,
      attendanceSummary,
      totalSalary: attendanceData.reduce((sum, item) => sum + item.pay.salary, 0),
      attendances: attendanceData,
    };
  }

  async removeStaff(id: string) {
    const staff = await this.prisma.user.findFirst({
      where: { id, role: Role.STAFF },
      select: { id: true },
    });
    if (!staff) throw new NotFoundException('Không tìm thấy nhân viên');
    const user = await this.prisma.user.update({
      where: { id },
      data: { role: Role.CUSTOMER },
    });
    return {
      id: user.id,
      role: user.role,
      message: 'Đã thu hồi quyền nhân viên; tài khoản khách hàng vẫn được giữ lại',
    };
  }

  private splitPersonName(name: string) {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    return {
      firstName: parts.length > 1 ? parts.slice(0, -1).join(' ') : parts[0],
      lastName: parts.length > 1 ? parts.at(-1) : null,
    };
  }

  private publicStaff(staff: {
    id: string;
    username: string | null;
    email: string;
    firstName: string | null;
    lastName: string | null;
    phone: string | null;
    role: Role;
    createdAt: Date;
  }) {
    return {
      id: staff.id,
      username: staff.username,
      email: staff.email,
      name:
        [staff.firstName, staff.lastName].filter(Boolean).join(' ') ||
        staff.email,
      phone: staff.phone || '',
      role: staff.role,
      createdAt: staff.createdAt,
    };
  }

  async listMovies() {
    await this.movieStatusService.synchronizeStatuses();
    return this.prisma.movie.findMany({
      include: { genres: { include: { genre: true } }, _count: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getMovieSales(id: string) {
    const movie = await this.prisma.movie.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        posterUrl: true,
        releaseDate: true,
        endDate: true,
        status: true,
      },
    });
    if (!movie) throw new NotFoundException('Movie not found');

    const movieBookingFilter = {
      showtime: { movieId: id },
    } satisfies Prisma.BookingWhereInput;
    const successfulPaymentFilter = {
      status: PaymentStatus.SUCCESS,
      booking: movieBookingFilter,
    } satisfies Prisma.PaymentWhereInput;

    const [successfulPayments, soldTickets] =
      await Promise.all([
        this.prisma.payment.findMany({
          where: successfulPaymentFilter,
          orderBy: [{ paidAt: 'asc' }, { createdAt: 'asc' }],
          select: { amount: true, paidAt: true, createdAt: true },
        }),
        this.prisma.ticket.count({
          where: {
            booking: { ...movieBookingFilter, status: 'PAID' },
          },
        }),
      ]);

    const totalRevenue = successfulPayments.reduce(
      (sum, payment) => sum + Number(payment.amount),
      0,
    );
    const paidInvoices = successfulPayments.length;
    const lastPayment = successfulPayments.at(-1);
    return {
      movie,
      revenue: totalRevenue,
      currency: 'VND',
      paidInvoices,
      soldTickets,
      averageRevenuePerInvoice:
        paidInvoices > 0 ? totalRevenue / paidInvoices : 0,
      averageTicketsPerInvoice:
        paidInvoices > 0 ? soldTickets / paidInvoices : 0,
      lastPaidAt: lastPayment?.paidAt || lastPayment?.createdAt || null,
      revenueByDate: this.movieRevenueByDate(
        movie.releaseDate,
        successfulPayments,
      ),
    };
  }

  private movieRevenueByDate(
    releaseDate: Date | null,
    payments: Array<{ amount: Prisma.Decimal; paidAt: Date | null; createdAt: Date }>,
  ) {
    const today = formatDateInDaNang(new Date());
    const firstPaymentDate = payments[0]
      ? formatDateInDaNang(payments[0].paidAt || payments[0].createdAt)
      : today;
    const startDate = releaseDate
      ? formatDateInDaNang(releaseDate)
      : firstPaymentDate;
    const endDate = startDate > today ? startDate : today;
    const totals = new Map<string, { revenue: number; invoiceCount: number }>();

    payments.forEach((payment) => {
      const date = formatDateInDaNang(payment.paidAt || payment.createdAt);
      const current = totals.get(date) || { revenue: 0, invoiceCount: 0 };
      current.revenue += Number(payment.amount);
      current.invoiceCount += 1;
      totals.set(date, current);
    });

    const days: Array<{ date: string; revenue: number; invoiceCount: number }> = [];
    const cursor = new Date(`${startDate}T00:00:00.000Z`);
    const lastDay = new Date(`${endDate}T00:00:00.000Z`);
    while (cursor <= lastDay) {
      const date = cursor.toISOString().slice(0, 10);
      const total = totals.get(date) || { revenue: 0, invoiceCount: 0 };
      days.push({ date, ...total });
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    return days;
  }

  createMovie(dto: CreateMovieDto) {
    return this.prisma.movie.create({
      data: this.movieData(dto),
      include: { genres: { include: { genre: true } } },
    });
  }

  async createMovieFromTmdb(dto: CreateMovieFromTmdbDto) {
    const tmdbId = Number(dto.tmdbId);
    if (!Number.isInteger(tmdbId) || tmdbId < 1) {
      throw new BadRequestException('TMDB movie ID is invalid');
    }
    const releaseDate = new Date(dto.releaseDate);
    const endDate = new Date(dto.endDate);
    const status = this.movieStatusService.resolveStatus(
      releaseDate,
      endDate,
      MovieStatus.DRAFT,
    );
    return this.upsertMovieFromTmdb(
      tmdbId,
      releaseDate,
      endDate,
      status,
    );
  }

  private async upsertMovieFromTmdb(
    tmdbId: number,
    releaseDate: Date,
    endDate: Date,
    status: MovieStatus,
  ) {
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
    const posterPath = details.poster_path || detailsEn.poster_path;
    const existingMovie = await this.prisma.movie.findFirst({
      where: { tmdbId },
    });

    return this.prisma.$transaction(async (tx) => {
      const movieData = {
        tmdbId,
        title: details.title || detailsEn.title,
        description: details.overview || detailsEn.overview || null,
        durationMin: details.runtime || detailsEn.runtime || 100,
        releaseDate,
        endDate,
        posterUrl: this.tmdbImageUrl(posterPath, 'w500'),
        trailerUrl,
        ageRating: 'P',
        status,
      };
      const movie = existingMovie
        ? await tx.movie.update({
            where: { id: existingMovie.id },
            data: movieData,
          })
        : await tx.movie.create({ data: movieData });

      await tx.movieGenre.deleteMany({ where: { movieId: movie.id } });

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

  async updateMovie(id: string, dto: UpdateMovieDto) {
    const movie = await this.ensureMovie(id);
    return this.prisma.$transaction(async (tx) => {
      if (dto.genreIds) {
        await tx.movieGenre.deleteMany({ where: { movieId: id } });
      }
      return tx.movie.update({
        where: { id },
        data: this.movieData(dto, id, movie),
        include: { genres: { include: { genre: true } } },
      });
    });
  }

  deleteMovie(id: string) {
    return this.prisma.movie.delete({ where: { id } });
  }

  listCinemaChains() {
    return this.prisma.cinemaChain.findMany({
      where: { city: 'Đà Nẵng' },
      include: { cinemas: true },
      orderBy: { name: 'asc' },
    });
  }

  createCinemaChain(dto: CreateCinemaChainDto) {
    return this.prisma.cinemaChain.create({
      data: { ...dto, city: dto.city || 'Đà Nẵng' },
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
      where: { city: 'Đà Nẵng' },
      include: { chain: true, rooms: true, ticketPrices: true },
      orderBy: [{ code: 'asc' }, { name: 'asc' }],
    });
  }

  async getCinemaOverview(id: string) {
    await this.ensureCinema(id);
    const today = formatDateInDaNang(new Date());
    const startAt = new Date(`${today}T00:00:00.000+07:00`);
    const endAt = new Date(startAt.getTime() + 24 * 60 * 60 * 1000);
    const cinemaBookingFilter = {
      showtime: { room: { cinemaId: id } },
    } satisfies Prisma.BookingWhereInput;

    const [rooms, seats, todayShowtimes, revenue] = await Promise.all([
      this.prisma.room.count({ where: { cinemaId: id } }),
      this.prisma.seat.count({ where: { room: { cinemaId: id } } }),
      this.prisma.showtime.count({
        where: { room: { cinemaId: id }, startAt: { gte: startAt, lt: endAt } },
      }),
      this.prisma.payment.aggregate({
        where: {
          status: PaymentStatus.SUCCESS,
          booking: cinemaBookingFilter,
        },
        _sum: { amount: true },
      }),
    ]);

    return {
      rooms,
      seats,
      todayShowtimes,
      revenue: Number(revenue._sum.amount || 0),
      currency: 'VND',
      date: today,
    };
  }

  async getCinemaDetail(id: string) {
    const today = formatDateInDaNang(new Date());
    const todayStart = new Date(`${today}T00:00:00.000+07:00`);
    const tomorrowStart = this.addMinutes(todayStart, 24 * 60);
    const cinemaBookingFilter = {
      showtime: { room: { cinemaId: id } },
    } satisfies Prisma.BookingWhereInput;

    const [cinema, rooms, showtimes, revenue] = await Promise.all([
      this.prisma.cinema.findUnique({
        where: { id },
        include: { chain: true, ticketPrices: true },
      }),
      this.prisma.room.findMany({
        where: { cinemaId: id },
        include: ADMIN_ROOM_INCLUDE,
        orderBy: { name: 'asc' },
      }),
      this.prisma.showtime.findMany({
        where: {
          room: { cinemaId: id },
          endAt: { gt: todayStart },
        },
        include: {
          movie: true,
          room: { include: { cinema: { include: { chain: true } } } },
          showtimeSeats: { select: { status: true } },
        },
        orderBy: { startAt: 'asc' },
      }),
      this.prisma.payment.aggregate({
        where: {
          status: PaymentStatus.SUCCESS,
          booking: cinemaBookingFilter,
        },
        _sum: { amount: true },
      }),
    ]);
    if (!cinema) throw new NotFoundException('Cinema not found');

    const roomData = rooms.map((room) => this.adminRoomData(room));
    const seats = rooms.flatMap((room) => room.seats);
    const showtimeData = showtimes.map((showtime) => {
      const totalSeats = showtime.showtimeSeats.length;
      const bookedSeats = showtime.showtimeSeats.filter(
        (seat) => seat.status === 'BOOKED',
      ).length;
      return {
        id: showtime.id,
        movieId: showtime.movieId,
        roomId: showtime.roomId,
        cinemaId: cinema.id,
        movie: showtime.movie,
        room: showtime.room,
        cinema,
        startAt: showtime.startAt,
        endAt: showtime.endAt,
        totalSeats,
        bookedSeats,
        seatBookedPercent: totalSeats
          ? Math.round((bookedSeats / totalSeats) * 100)
          : 0,
      };
    });

    return {
      cinema,
      rooms: roomData,
      seats,
      showtimes: showtimeData,
      overview: {
        rooms: roomData.length,
        seats: seats.length,
        todayShowtimes: showtimes.filter(
          (showtime) =>
            showtime.startAt >= todayStart && showtime.startAt < tomorrowStart,
        ).length,
        revenue: Number(revenue._sum.amount || 0),
        currency: 'VND',
        date: today,
      },
    };
  }

  async createCinema(dto: CreateCinemaDto) {
    if (dto.chainId) await this.ensureCinemaChain(dto.chainId);
    return this.prisma.cinema.create({
      data: { ...dto, city: dto.city || 'Đà Nẵng' },
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
      where: { cinemaId, seatType: { not: 'VIP' } },
      orderBy: { seatType: 'asc' },
    });
  }

  async upsertCinemaTicketPrice(
    cinemaId: string,
    dto: UpsertCinemaTicketPriceDto,
  ) {
    await this.ensureCinema(cinemaId);
    const seatType = this.parseSeatType(dto.seatType);
    const price = await this.prisma.cinemaTicketPrice.upsert({
      where: {
        cinemaId_seatType: {
          cinemaId,
          seatType,
        },
      },
      update: {
        price: dto.price,
        isActive: dto.isActive ?? true,
      },
      create: {
        cinemaId,
        seatType,
        price: dto.price,
        isActive: dto.isActive ?? true,
      },
    });

    if (price.isActive) {
      await this.syncTicketPriceToOpenSales(cinemaId, seatType, Number(price.price));
    }

    return price;
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

  async listRooms() {
    const rooms = await this.prisma.room.findMany({
      include: ADMIN_ROOM_INCLUDE,
      orderBy: [{ cinemaId: 'asc' }, { name: 'asc' }],
    });

    return rooms.map((room) => this.adminRoomData(room));
  }

  async getRoomHistory(id: string) {
    const room = await this.prisma.room.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        cinema: { select: { id: true, name: true } },
      },
    });
    if (!room) throw new NotFoundException('Room not found');

    const showtimes = await this.prisma.showtime.findMany({
      where: { roomId: id, endAt: { lt: new Date() } },
      orderBy: { startAt: 'desc' },
      include: {
        movie: { select: { id: true, title: true, posterUrl: true } },
        bookings: {
          where: {
            payments: { some: { status: PaymentStatus.SUCCESS } },
          },
          select: {
            payments: {
              where: { status: PaymentStatus.SUCCESS },
              select: { amount: true },
            },
            _count: { select: { tickets: true } },
          },
        },
      },
    });

    const history = showtimes.map((showtime) => {
      const revenue = showtime.bookings.reduce(
        (bookingTotal, booking) =>
          bookingTotal +
          booking.payments.reduce(
            (paymentTotal, payment) => paymentTotal + Number(payment.amount),
            0,
          ),
        0,
      );
      const soldTickets = showtime.bookings.reduce(
        (total, booking) => total + booking._count.tickets,
        0,
      );
      return {
        id: showtime.id,
        movie: showtime.movie,
        startAt: showtime.startAt,
        endAt: showtime.endAt,
        paidInvoices: showtime.bookings.length,
        soldTickets,
        revenue,
      };
    });

    return {
      room,
      totalShowtimes: history.length,
      paidInvoices: history.reduce(
        (total, showtime) => total + showtime.paidInvoices,
        0,
      ),
      soldTickets: history.reduce(
        (total, showtime) => total + showtime.soldTickets,
        0,
      ),
      revenue: history.reduce(
        (total, showtime) => total + showtime.revenue,
        0,
      ),
      currency: 'VND',
      showtimes: history,
    };
  }

  async createRoom(dto: CreateRoomDto) {
    await this.ensureCinema(dto.cinemaId);
    return this.prisma.room.create({
      data: { cinemaId: dto.cinemaId, name: dto.name, capacity: 0 },
    });
  }

  async updateRoom(id: string, dto: UpdateRoomDto) {
    await this.ensureRoom(id);
    const seatCount = await this.prisma.seat.count({ where: { roomId: id } });
    return this.prisma.room.update({
      where: { id },
      data: { name: dto.name, capacity: seatCount },
    });
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

  updateSeat(id: string, dto: UpdateSeatDto) {
    return this.prisma.seat.update({ where: { id }, data: dto });
  }

  async deleteSeat(id: string) {
    const seat = await this.prisma.seat.findUnique({
      where: { id },
      select: { roomId: true },
    });
    if (!seat) throw new NotFoundException('Seat not found');
    return this.prisma.$transaction(async (tx) => {
      const deleted = await tx.seat.delete({ where: { id } });
      const capacity = await tx.seat.count({ where: { roomId: seat.roomId } });
      await tx.room.update({ where: { id: seat.roomId }, data: { capacity } });
      return deleted;
    });
  }

  async generateSeats(roomId: string, dto: GenerateSeatsDto) {
    const room = await this.ensureRoom(roomId);
    const coupleRows = new Set(dto.coupleRows || []);
    const seats: Prisma.SeatCreateManyInput[] = [];

    for (const row of dto.rows) {
      const isCoupleRow = coupleRows.has(row);
      const seatCount = isCoupleRow ? Math.floor(dto.columns / 2) : dto.columns;
      for (let number = 1; number <= seatCount; number += 1) {
        seats.push({
          roomId,
          row,
          number,
          position: isCoupleRow ? (number - 1) * 2 + 1 : number,
          type: isCoupleRow ? 'COUPLE' : 'STANDARD',
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

    if (!room) throw new NotFoundException('Room not found');
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
      cleanupEndAt: this.addMinutes(showtime.endAt, CLEANUP_MINUTES),
    }));

    const availableSlots: Array<{
      startAt: Date;
      endAt: Date;
      latestStartAt: Date;
      durationMinutes: number;
    }> = [];

    let cursor = windowStart;
    for (const item of occupied) {
      const nextShowtimeStartWithCleanup = this.addMinutes(
        item.startAt,
        -CLEANUP_MINUTES,
      );
      const slotEnd =
        nextShowtimeStartWithCleanup < windowEnd
          ? nextShowtimeStartWithCleanup
          : windowEnd;
      const slotMinutes = this.minutesBetween(cursor, slotEnd);
      if (slotMinutes >= requiredMinutes) {
        availableSlots.push({
          startAt: cursor,
          endAt: slotEnd,
          latestStartAt: this.addMinutes(slotEnd, -requiredMinutes),
          durationMinutes: slotMinutes,
        });
      }
      const cleanupEndAt =
        item.cleanupEndAt > windowStart ? item.cleanupEndAt : windowStart;
      if (cleanupEndAt > cursor) cursor = cleanupEndAt;
    }

    const tailMinutes = this.minutesBetween(cursor, windowEnd);
    if (tailMinutes >= requiredMinutes) {
      availableSlots.push({
        startAt: cursor,
        endAt: windowEnd,
        latestStartAt: this.addMinutes(windowEnd, -requiredMinutes),
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

  private movieData(
    dto: CreateMovieDto | UpdateMovieDto,
    movieId?: string,
    currentMovie?: { releaseDate: Date | null; endDate: Date | null; status: MovieStatus },
  ) {
    const { genreIds, releaseDate, endDate, status, ...rest } = dto;
    const parsedReleaseDate = releaseDate
      ? new Date(releaseDate)
      : currentMovie?.releaseDate;
    const parsedEndDate = endDate ? new Date(endDate) : currentMovie?.endDate;
    const resolvedStatus = this.movieStatusService.resolveStatus(
      parsedReleaseDate,
      parsedEndDate,
      (status as MovieStatus | undefined) ||
        currentMovie?.status ||
        MovieStatus.DRAFT,
    );
    return {
      ...rest,
      releaseDate: releaseDate ? new Date(releaseDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      status: resolvedStatus,
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

  private adminRoomData(room: AdminRoomWithDetails) {
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
  }

  private dashboardShowtimeData(showtime: DashboardShowtime) {
    return {
      id: showtime.id,
      movie: showtime.movie,
      room: showtime.room,
      startAt: showtime.startAt,
      endAt: showtime.endAt,
      totalSeats: showtime.showtimeSeats.length,
      bookedSeats: showtime.showtimeSeats.filter(
        (seat) => seat.status === 'BOOKED',
      ).length,
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
    const missing = seatTypes.filter(
      (seatType) => priceBySeatType[seatType] === undefined,
    );
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

  private parseSeatType(value: string) {
    if (!['STANDARD', 'COUPLE'].includes(value)) {
      throw new BadRequestException('Invalid seat type');
    }
    return value as 'STANDARD' | 'COUPLE';
  }

  private async syncTicketPriceToOpenSales(
    cinemaId: string,
    seatType: 'STANDARD' | 'COUPLE',
    price: number,
  ) {
    const affectedBookings = await this.prisma.booking.findMany({
      where: {
        status: 'PENDING',
        showtime: { room: { cinemaId } },
        bookingItems: {
          some: {
            showtimeSeat: {
              status: { not: 'BOOKED' },
              seat: { type: seatType },
            },
          },
        },
      },
      select: { id: true, user: { select: { role: true } } },
    });

    await this.prisma.$transaction(async (tx) => {
      await tx.showtimeSeat.updateMany({
        where: {
          status: { not: 'BOOKED' },
          showtime: { room: { cinemaId } },
          seat: { type: seatType },
        },
        data: { price },
      });

      for (const booking of affectedBookings) {
        await tx.bookingItem.updateMany({
          where: {
            bookingId: booking.id,
            showtimeSeat: {
              status: { not: 'BOOKED' },
              seat: { type: seatType },
            },
          },
          data: {
            unitPrice: ticketPriceForRole(price, booking.user.role),
          },
        });
        const detail = await tx.booking.findUnique({
          where: { id: booking.id },
          include: {
            bookingItems: true,
            comboItems: true,
          },
        });
        if (!detail) continue;

        const seatSubtotal = detail.bookingItems.reduce(
          (sum, item) => sum + Number(item.unitPrice),
          0,
        );
        const comboSubtotal = detail.comboItems.reduce(
          (sum, item) => sum + Number(item.unitPrice) * item.quantity,
          0,
        );

        await tx.booking.update({
          where: { id: booking.id },
          data: { totalAmount: seatSubtotal + comboSubtotal },
        });
      }
    });
  }

  private addMinutes(date: Date, minutes: number) {
    return new Date(date.getTime() + minutes * 60 * 1000);
  }

  private minutesBetween(startAt: Date, endAt: Date) {
    return Math.floor((endAt.getTime() - startAt.getTime()) / 60000);
  }

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
      cursor = this.addMinutes(cursor, stepMinutes);
    }

    return times;
  }

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

  private async fetchTmdb(
    path: string,
    params: Record<string, string | number | boolean> = {},
  ) {
    const apiKey = this.cleanEnvValue(process.env.TMDB_API_KEY);
    const readAccessToken = this.cleanEnvValue(
      process.env.TMDB_READ_ACCESS_TOKEN,
    );
    const shouldUseReadToken = Boolean(
      readAccessToken && readAccessToken.startsWith('eyJ'),
    );

    if (!apiKey && !shouldUseReadToken) {
      throw new BadRequestException('TMDB API key is not configured');
    }

    const url = new URL(`${TMDB_API_URL}${path}`);
    Object.entries(params).forEach(([key, value]) =>
      url.searchParams.set(key, String(value)),
    );
    if (!shouldUseReadToken && apiKey) {
      url.searchParams.set('api_key', apiKey);
    }

    const response = await fetch(url, {
      headers: shouldUseReadToken
        ? {
            Authorization: `Bearer ${readAccessToken}`,
            Accept: 'application/json',
          }
        : { Accept: 'application/json' },
    });

    if (!response.ok) {
      let message = `TMDB request failed: ${response.status}`;
      try {
        const body = await response.json();
        if (body?.status_message) message = body.status_message;
      } catch {
        // Keep the generic message when TMDB does not return JSON.
      }
      throw new BadRequestException(message);
    }

    return response.json();
  }

  private async fetchTmdbTrailer(tmdbId: number) {
    for (const language of ['vi-VN', 'en-US']) {
      const videos = await this.fetchTmdb(`/movie/${tmdbId}/videos`, {
        language,
      });
      const trailerUrl = this.pickTmdbTrailer(videos.results || []);
      if (trailerUrl) return trailerUrl;
    }
    return null;
  }

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

  private tmdbImageUrl(path: string | null | undefined, size: string) {
    return path ? `${TMDB_IMAGE_BASE_URL}/${size}${path}` : null;
  }

  private cleanEnvValue(value?: string) {
    return (value || '')
      .trim()
      .replace(/^['"]|['"]$/g, '')
      .replace(/^\[|\]$/g, '');
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
