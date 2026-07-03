import { Body, Controller, Param, Post } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';

@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  create(@Body() createBookingDto: CreateBookingDto) {
    return this.bookingsService.create(createBookingDto);
  }

  @Post('expire')
  expirePendingBookings() {
    return this.bookingsService.expirePendingBookings();
  }

  @Post(':bookingId/pay')
  pay(@Param('bookingId') bookingId: string) {
    return this.bookingsService.pay(bookingId);
  }
}
