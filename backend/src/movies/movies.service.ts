import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { MovieStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMovieReviewDto } from './dto/movie-review.dto';

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
export class MoviesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
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

  async findOne(movieId: string) {
    const movie = await this.prisma.movie.findUnique({
      where: { id: movieId },
      include: movieInclude,
    });

    if (!movie) {
      throw new NotFoundException('Movie not found');
    }

    return {
      movie: this.mapMovie(movie),
    };
  }

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

  async createReview(movieId: string, dto: CreateMovieReviewDto) {
    await this.ensureMovie(movieId);
    const user = await this.prisma.user.findUnique({ where: { id: dto.userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const canReview = await this.userHasPaidMovieBooking(dto.userId, movieId);
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
      status:
        movie._count.showtimes > 0
          ? 'nowShowing'
          : this.mapMovieStatus(movie.status),
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
      date: this.formatDate(showtime.startAt),
      startTime: this.formatTime(showtime.startAt),
      endTime: this.formatTime(showtime.endAt),
      startAt: showtime.startAt,
      endAt: showtime.endAt,
      price: {
        normal: priceBySeatType.STANDARD ?? Number(showtime.basePrice),
        vip: priceBySeatType.VIP ?? priceBySeatType.STANDARD ?? Number(showtime.basePrice),
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

  private priceBySeatType(showtimeSeats: ShowtimeWithInclude['showtimeSeats']) {
    return showtimeSeats.reduce((prices, showtimeSeat) => {
      const seatType = showtimeSeat.seat.type;
      const price = Number(showtimeSeat.price);
      if (prices[seatType] === undefined || price < prices[seatType]) {
        prices[seatType] = price;
      }
      return prices;
    }, {} as Record<string, number>);
  }

  private mapMovieStatus(status: MovieStatus) {
    if (status === MovieStatus.COMING_SOON) return 'comingSoon';
    if (status === MovieStatus.ENDED) return 'ended';
    return 'nowShowing';
  }

  private averageRating(reviews: Array<{ rating: number }>) {
    if (!reviews.length) return 0;
    const total = reviews.reduce((sum, review) => sum + review.rating, 0);
    return Number((total / reviews.length).toFixed(1));
  }

  private async ensureMovie(movieId: string) {
    const movie = await this.prisma.movie.findUnique({ where: { id: movieId } });
    if (!movie) {
      throw new NotFoundException('Movie not found');
    }
    return movie;
  }

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
