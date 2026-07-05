import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { CheckInTicketDto } from './dto/check-in-ticket.dto';

@Controller('tickets')
export class TicketCheckinsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Get('qr/:qrToken')
  findByQr(@Param('qrToken') qrToken: string) {
    return this.bookingsService.findTicketByQr(qrToken);
  }

  @Post('qr/:qrToken/check-in')
  checkIn(
    @Param('qrToken') qrToken: string,
    @Body() checkInTicketDto: CheckInTicketDto,
  ) {
    return this.bookingsService.checkInTicket(qrToken, checkInTicketDto);
  }
}
