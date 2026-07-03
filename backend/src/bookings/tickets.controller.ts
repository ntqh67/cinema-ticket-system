import { Controller, Get, Param } from '@nestjs/common';
import { BookingsService } from './bookings.service';

@Controller('users')
export class TicketsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Get(':userId/tickets')
  findUserTickets(@Param('userId') userId: string) {
    return this.bookingsService.findUserTickets(userId);
  }
}
