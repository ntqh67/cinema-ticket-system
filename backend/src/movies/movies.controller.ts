/**
 * Mục đích: Tiếp nhận yêu cầu HTTP cho miền phim và đánh giá phim và chuyển xử lý sang service.
 */
import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
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
  findReviews(@Param('movieId') movieId: string, @Query('userId') userId?: string) {
    return this.moviesService.findReviews(movieId, userId);
  }

  @Post(':movieId/reviews')
  // Tạo dữ liệu mới trong khối createReview và trả về kết quả đã chuẩn hóa.
  createReview(@Param('movieId') movieId: string, @Body() dto: CreateMovieReviewDto) {
    return this.moviesService.createReview(movieId, dto);
  }
}
