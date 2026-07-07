import { Controller, Get, Param, Query } from '@nestjs/common';
import { SeatsService } from './seats.service';

@Controller('showtimes')
export class SeatsController {
  constructor(private readonly seatsService: SeatsService) {}

  @Get(':showtimeId/seats')
  findByShowtime(
    @Param('showtimeId') showtimeId: string,
    @Query('sessionId') sessionId?: string,
    @Query('userId') userId?: string,
  ) {
    return this.seatsService.findByShowtime(showtimeId, { sessionId, userId });
  }
}
