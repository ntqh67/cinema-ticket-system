/**
 * Mục đích: Cài đặt nghiệp vụ phim và đánh giá phim; dữ liệu bền vững được truy cập qua Prisma.
 */
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { MovieStatus, Prisma } from '@prisma/client';
import {
  formatDateInDaNang,
  formatTimeInDaNang,
} from '../common/danang-date';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMovieReviewDto } from './dto/movie-review.dto';
import { MovieStatusService } from './movie-status.service';

const movieInclude = {
  genres: {
    include: {
      genre: true,
    },
  },
  _count: {
    select: {
      showtimes: true,
      reviews: true,
    },
  },
  reviews: {
    select: {
      rating: true,
    },
  },
} satisfies Prisma.MovieInclude;

const showtimeInclude = {
  room: {
    include: {
      cinema: {
        include: {
          chain: true,
        },
      },
    },
  },
  showtimeSeats: {
    select: {
      status: true,
      price: true,
      seat: {
        select: {
          type: true,
        },
      },
    },
  },
} satisfies Prisma.ShowtimeInclude;

type MovieWithInclude = Prisma.MovieGetPayload<{ include: typeof movieInclude }>;
type ShowtimeWithInclude = Prisma.ShowtimeGetPayload<{
  include: typeof showtimeInclude;
}>;

@Injectable()
// Lớp MoviesService tập trung các quy tắc nghiệp vụ và phối hợp truy cập dữ liệu.
export class MoviesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly movieStatusService: MovieStatusService,
  ) {}

  // Đọc và lọc dữ liệu cần thiết trong khối findAll.
  async findAll() {
    await this.movieStatusService.synchronizeStatuses();
    const movies = await this.prisma.movie.findMany({
      where: {
        status: {
          in: [MovieStatus.NOW_SHOWING, MovieStatus.COMING_SOON],
        },
      },
      include: movieInclude,
      orderBy: [{ status: 'asc' }, { releaseDate: 'asc' }, { title: 'asc' }],
    });

    return {
      movies: movies.map((movie) => this.mapMovie(movie)),
    };
  }

  // Đọc và lọc dữ liệu cần thiết trong khối findOne.
  async findOne(movieId: string) {
    await this.movieStatusService.synchronizeStatuses();
    const movie = await this.prisma.movie.findUnique({
      where: { id: movieId },
      include: movieInclude,
    });

    // Chặn luồng hiện tại khi dữ liệu hoặc điều kiện bắt buộc chưa được đáp ứng.
    if (!movie) {
      throw new NotFoundException('Movie not found');
    }

    return {
      movie: this.mapMovie(movie),
    };
  }

  // Dựng phần giao diện tương ứng trong khối findShowtimes.
  async findShowtimes(movieId: string) {
    const movie = await this.prisma.movie.findUnique({
      where: { id: movieId },
      select: { id: true },
    });

    if (!movie) {
      throw new NotFoundException('Movie not found');
    }

    const showtimes = await this.prisma.showtime.findMany({
      where: { movieId },
      include: showtimeInclude,
      orderBy: { startAt: 'asc' },
    });

    return {
      movieId,
      showtimes: showtimes.map((showtime) => this.mapShowtime(showtime)),
    };
  }

  // Đọc và lọc dữ liệu cần thiết trong khối findReviews.
  async findReviews(movieId: string, userId?: string) {
    await this.ensureMovie(movieId);
    const [reviews, canReview, currentUserReview] = await Promise.all([
      this.prisma.movieReview.findMany({
        where: { movieId },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
      }),
      userId ? this.userHasPaidMovieBooking(userId, movieId) : Promise.resolve(false),
      userId
        ? this.prisma.movieReview.findUnique({
            where: {
              userId_movieId: {
                userId,
                movieId,
              },
            },
          })
        : Promise.resolve(null),
    ]);

    return {
      movieId,
      ratingAverage: this.averageRating(reviews),
      ratingCount: reviews.length,
      canReview,
      currentUserReview,
      reviews: reviews.map((review) => ({
        id: review.id,
        userId: review.userId,
        userName: [review.user.firstName, review.user.lastName].filter(Boolean).join(' ') || 'User',
        rating: review.rating,
        comment: review.comment || '',
        createdAt: review.createdAt,
        updatedAt: review.updatedAt,
      })),
    };
  }

  // Tạo dữ liệu mới trong khối createReview và trả về kết quả đã chuẩn hóa.
  async createReview(movieId: string, dto: CreateMovieReviewDto) {
    await this.ensureMovie(movieId);
    const user = await this.prisma.user.findUnique({ where: { id: dto.userId } });
    // Kiểm tra danh tính hoặc quyền sở hữu trước khi thao tác trên dữ liệu.
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const canReview = await this.userHasPaidMovieBooking(dto.userId, movieId);
    // Chặn luồng hiện tại khi dữ liệu hoặc điều kiện bắt buộc chưa được đáp ứng.
    if (!canReview) {
      throw new BadRequestException('Only paid customers can review this movie');
    }

    const review = await this.prisma.movieReview.upsert({
      where: {
        userId_movieId: {
          userId: dto.userId,
          movieId,
        },
      },
      update: {
        rating: dto.rating,
        comment: dto.comment || null,
      },
      create: {
        userId: dto.userId,
        movieId,
        rating: dto.rating,
        comment: dto.comment || null,
      },
    });

    const summary = await this.prisma.movieReview.aggregate({
      where: { movieId },
      _avg: { rating: true },
      _count: { rating: true },
    });

    return {
      review,
      ratingAverage: Number((summary._avg.rating || 0).toFixed(1)),
      ratingCount: summary._count.rating,
    };
  }

  // Chuẩn hóa dữ liệu đầu vào/đầu ra trong khối mapMovie.
  private mapMovie(movie: MovieWithInclude) {
    return {
      id: movie.id,
      title: movie.title,
      titleEn: movie.title,
      description: movie.description || '',
      poster: movie.posterUrl || '',
      banner: movie.posterUrl || '',
      duration: movie.durationMin,
      releaseDate: movie.releaseDate,
      endDate: movie.endDate,
      status: this.mapMovieStatus(movie.status),
      genre: movie.genres.map((item) => item.genre.name),
      rating: this.averageRating(movie.reviews),
      ratingAverage: this.averageRating(movie.reviews),
      ratingCount: movie._count.reviews,
      language: 'Dang cap nhat',
      director: 'Dang cap nhat',
      ageRating: movie.ageRating || 'P',
      trailer: movie.trailerUrl || '',
      showtimeCount: movie._count.showtimes,
      backend: true,
    };
  }

  // Dựng phần giao diện tương ứng trong khối mapShowtime.
  private mapShowtime(showtime: ShowtimeWithInclude) {
    const totalSeats = showtime.showtimeSeats.length;
    const bookedSeats = showtime.showtimeSeats.filter(
      (seat) => seat.status !== 'AVAILABLE',
    ).length;
    const priceBySeatType = this.priceBySeatType(showtime.showtimeSeats);

    return {
      id: showtime.id,
      movieId: showtime.movieId,
      chainId: showtime.room.cinema.chainId || showtime.room.cinema.id,
      cinemaId: showtime.room.cinema.id,
      roomId: showtime.room.id,
      date: formatDateInDaNang(showtime.startAt),
      startTime: formatTimeInDaNang(showtime.startAt),
      endTime: formatTimeInDaNang(showtime.endAt),
      startAt: showtime.startAt,
      endAt: showtime.endAt,
      price: {
        normal: priceBySeatType.STANDARD ?? Number(showtime.basePrice),
        couple: priceBySeatType.COUPLE ?? priceBySeatType.STANDARD ?? Number(showtime.basePrice),
      },
      totalSeats,
      bookedSeats,
      chain: {
        id: showtime.room.cinema.chain?.id || showtime.room.cinema.id,
        name: showtime.room.cinema.chain?.name || showtime.room.cinema.name,
      },
      cinema: {
        id: showtime.room.cinema.id,
        chainId: showtime.room.cinema.chainId,
        chain: showtime.room.cinema.chain
          ? {
              id: showtime.room.cinema.chain.id,
              name: showtime.room.cinema.chain.name,
            }
          : null,
        name: showtime.room.cinema.name,
        shortName: showtime.room.cinema.name,
        address: showtime.room.cinema.address || '',
        city: showtime.room.cinema.city || '',
        phone: showtime.room.cinema.phone || '',
      },
      room: {
        id: showtime.room.id,
        cinemaId: showtime.room.cinema.id,
        name: showtime.room.name,
        type: '2D',
        capacity: showtime.room.capacity,
      },
      backend: true,
    };
  }

  // Áp dụng quy tắc ghế và quyền sở hữu giữ ghế trong khối priceBySeatType.
  private priceBySeatType(showtimeSeats: ShowtimeWithInclude['showtimeSeats']) {
    return showtimeSeats.reduce((prices, showtimeSeat) => {
      const seatType = showtimeSeat.seat.type;
      const price = Number(showtimeSeat.price);
      // Kiểm tra trạng thái và ràng buộc ghế trước khi thay đổi booking.
      if (prices[seatType] === undefined || price < prices[seatType]) {
        prices[seatType] = price;
      }
      return prices;
    }, {} as Record<string, number>);
  }

  // Chuẩn hóa dữ liệu đầu vào/đầu ra trong khối mapMovieStatus.
  private mapMovieStatus(status: MovieStatus) {
    // Rẽ nhánh theo trạng thái hiện tại để chỉ cho phép luồng nghiệp vụ hợp lệ.
    if (status === MovieStatus.COMING_SOON) return 'comingSoon';
    // Rẽ nhánh theo trạng thái hiện tại để chỉ cho phép luồng nghiệp vụ hợp lệ.
    if (status === MovieStatus.ENDED) return 'ended';
    return 'nowShowing';
  }

  // Thực hiện trách nhiệm riêng của khối averageRating.
  private averageRating(reviews: Array<{ rating: number }>) {
    // Kiểm tra số lượng phần tử để xử lý trường hợp rỗng hoặc vượt giới hạn.
    if (!reviews.length) return 0;
    const total = reviews.reduce((sum, review) => sum + review.rating, 0);
    return Number((total / reviews.length).toFixed(1));
  }

  // Kiểm tra điều kiện nghiệp vụ trong khối ensureMovie trước khi tiếp tục.
  private async ensureMovie(movieId: string) {
    const movie = await this.prisma.movie.findUnique({ where: { id: movieId } });
    if (!movie) {
      throw new NotFoundException('Movie not found');
    }
    return movie;
  }

  // Kiểm tra điều kiện nghiệp vụ trong khối userHasPaidMovieBooking trước khi tiếp tục.
  private async userHasPaidMovieBooking(userId: string, movieId: string) {
    const booking = await this.prisma.booking.findFirst({
      where: {
        userId,
        status: 'PAID',
        showtime: {
          movieId,
        },
      },
      select: { id: true },
    });
    return Boolean(booking);
  }
}
