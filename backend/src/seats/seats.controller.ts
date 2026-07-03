import { Controller, Get, Param } from '@nestjs/common';
import { SeatsService } from './seats.service';

@Controller('showtimes')
export class SeatsController {
  constructor(private readonly seatsService: SeatsService) {}

  @Get(':showtimeId/seats')
  findByShowtime(@Param('showtimeId') showtimeId: string) {
    return this.seatsService.findByShowtime(showtimeId);
  }
}
