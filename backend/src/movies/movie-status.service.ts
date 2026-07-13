/**
 * Đồng bộ trạng thái phim từ khoảng ngày phát hành tại múi giờ Đà Nẵng.
 */
import { BadRequestException, Injectable } from '@nestjs/common';
import { MovieStatus } from '@prisma/client';
import { formatDateInDaNang } from '../common/danang-date';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MovieStatusService {
  constructor(private readonly prisma: PrismaService) {}

  resolveStatus(
    releaseDate: Date | null | undefined,
    endDate: Date | null | undefined,
    fallback: MovieStatus = MovieStatus.DRAFT,
  ) {
    if (!releaseDate || !endDate) return fallback;

    const start = this.dateKey(releaseDate);
    const end = this.dateKey(endDate);
    const today = formatDateInDaNang(new Date());

    if (end < start) {
      throw new BadRequestException(
        'Ngày kết thúc phải bằng hoặc sau ngày bắt đầu',
      );
    }
    if (today < start) return MovieStatus.COMING_SOON;
    if (today > end) return MovieStatus.ENDED;
    return MovieStatus.NOW_SHOWING;
  }

  async synchronizeStatuses() {
    const movies = await this.prisma.movie.findMany({
      where: {
        releaseDate: { not: null },
        endDate: { not: null },
      },
      select: {
        id: true,
        releaseDate: true,
        endDate: true,
        status: true,
      },
    });

    const updates = movies
      .map((movie) => ({
        id: movie.id,
        status: this.resolveStatus(
          movie.releaseDate,
          movie.endDate,
          movie.status,
        ),
        currentStatus: movie.status,
      }))
      .filter((movie) => movie.status !== movie.currentStatus)
      .map((movie) =>
        this.prisma.movie.update({
          where: { id: movie.id },
          data: { status: movie.status },
        }),
      );

    if (updates.length > 0) await this.prisma.$transaction(updates);
  }

  private dateKey(value: Date) {
    return formatDateInDaNang(value);
  }
}
