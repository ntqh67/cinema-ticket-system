import { Injectable, NotFoundException } from '@nestjs/common';
import { MovieStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const movieInclude = {
  genres: {
    include: {
      genre: true,
    },
  },
  _count: {
    select: {
      showtimes: true,
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

  private mapMovie(movie: MovieWithInclude) {
    return {
      id: movie.id,
      title: movie.title,
      titleEn: movie.title,
      description: movie.description || '',
      poster: movie.posterUrl || `https://picsum.photos/seed/${movie.id}/400/600`,
      banner: movie.posterUrl || `https://picsum.photos/seed/${movie.id}-banner/1280/720`,
      duration: movie.durationMin,
      releaseDate: movie.releaseDate,
      status:
        movie._count.showtimes > 0
          ? 'nowShowing'
          : this.mapMovieStatus(movie.status),
      genre: movie.genres.map((item) => item.genre.name),
      rating: 8,
      language: 'Dang cap nhat',
      director: 'Dang cap nhat',
      ageRating: 'P',
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
        normal: Number(showtime.basePrice),
        vip: 120000,
        couple: 180000,
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

  private mapMovieStatus(status: MovieStatus) {
    if (status === MovieStatus.COMING_SOON) return 'comingSoon';
    if (status === MovieStatus.ENDED) return 'ended';
    return 'nowShowing';
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
