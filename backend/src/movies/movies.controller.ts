import { Controller, Get, Param } from '@nestjs/common';
import { MoviesService } from './movies.service';

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
}
