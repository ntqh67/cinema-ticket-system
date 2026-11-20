import { AuthGuard } from '../auth/guards/auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
/**
 * Mục đích: Tiếp nhận yêu cầu HTTP cho miền phim và đánh giá phim và chuyển xử lý sang service.
 */
import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { MoviesService } from './movies.service';
import { CreateMovieReviewDto } from './dto/movie-review.dto';

@Controller('movies')
// Lớp MoviesController nhận thao tác từ HTTP hoặc giao diện và chuyển chúng tới lớp nghiệp vụ phù hợp.
export class MoviesController {
  constructor(private readonly moviesService: MoviesService) {}

  @Get()
  // Đọc và lọc dữ liệu cần thiết trong khối findAll.
  findAll() {
    return this.moviesService.findAll();
  }

  @Get(':movieId')
  // Đọc và lọc dữ liệu cần thiết trong khối findOne.
  findOne(@Param('movieId') movieId: string) {
    return this.moviesService.findOne(movieId);
  }

  @Get(':movieId/showtimes')
  // Dựng phần giao diện tương ứng trong khối findShowtimes.
  findShowtimes(@Param('movieId') movieId: string) {
    return this.moviesService.findShowtimes(movieId);
  }

  @Get(':movieId/reviews')
  // Đọc và lọc dữ liệu cần thiết trong khối findReviews.
  findReviews(@Param('movieId') movieId: string) {
    return this.moviesService.findReviews(movieId);
  }

  @Get(':movieId/reviews/me')
  @UseGuards(AuthGuard)
  // Khả năng đánh giá và đánh giá hiện tại lấy từ phiên đăng nhập.
  findMyReview(
    @Param('movieId') movieId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.moviesService.findReviews(movieId, user.id);
  }

  @Post(':movieId/reviews')
  @UseGuards(AuthGuard)
  // Tạo dữ liệu mới trong khối createReview và trả về kết quả đã chuẩn hóa.
  createReview(
    @Param('movieId') movieId: string,
    @Body() dto: CreateMovieReviewDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.moviesService.createReview(movieId, dto, user.id);
  }
}
