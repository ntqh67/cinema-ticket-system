import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { MoviesService } from './movies.service';
import { CreateMovieReviewDto } from './dto/movie-review.dto';

@Controller('movies')
export class MoviesController {
  constructor(private readonly moviesService: MoviesService) {}

  @Get()
  findAll() {
    return this.moviesService.findAll();
  }

  @Get(':movieId')
  findOne(@Param('movieId') movieId: string) {
    return this.moviesService.findOne(movieId);
  }

  @Get(':movieId/showtimes')
  findShowtimes(@Param('movieId') movieId: string) {
    return this.moviesService.findShowtimes(movieId);
  }

  @Get(':movieId/reviews')
  findReviews(@Param('movieId') movieId: string, @Query('userId') userId?: string) {
    return this.moviesService.findReviews(movieId, userId);
  }

  @Post(':movieId/reviews')
  createReview(@Param('movieId') movieId: string, @Body() dto: CreateMovieReviewDto) {
    return this.moviesService.createReview(movieId, dto);
  }
}
