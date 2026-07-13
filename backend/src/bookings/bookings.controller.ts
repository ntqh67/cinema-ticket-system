/**
 * Controller tiếp nhận yêu cầu đặt vé, thanh toán SePay và vé điện tử.
 */
import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingCombosDto } from './dto/update-booking-combos.dto';

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

  @Get('payment-methods')
  getPaymentMethods() {
    return this.bookingsService.getPaymentMethods();
  }

  @Post('sepay-webhook')
  handleSepayWebhook(
    @Headers('authorization') authorization: string | undefined,
    @Body() payload: Record<string, unknown>,
  ) {
    return this.bookingsService.handleSepayWebhook(authorization, payload);
  }

  @Get('qr/:bookingQrToken')
  findBookingByQr(@Param('bookingQrToken') bookingQrToken: string) {
    return this.bookingsService.findBookingByQr(bookingQrToken);
  }

  @Post('qr/:bookingQrToken/check-in')
  checkInBookingByQr(
    @Param('bookingQrToken') bookingQrToken: string,
    @Body() body: { checkedInBy?: string; notes?: string },
  ) {
    return this.bookingsService.checkInBookingByQr(bookingQrToken, body);
  }

  @Get()
  findAll() {
    return this.bookingsService.findAll();
  }

  @Get(':bookingId/payment-status')
  getPaymentStatus(@Param('bookingId') bookingId: string) {
    return this.bookingsService.getPaymentStatus(bookingId);
  }

  @Get(':bookingId')
  findOne(@Param('bookingId') bookingId: string) {
    return this.bookingsService.findOne(bookingId);
  }

  @Get(':bookingId/tickets')
  findBookingTickets(@Param('bookingId') bookingId: string) {
    return this.bookingsService.findBookingTickets(bookingId);
  }

  @Patch(':bookingId/combos')
  updateBookingCombos(
    @Param('bookingId') bookingId: string,
    @Body() dto: UpdateBookingCombosDto,
  ) {
    return this.bookingsService.updateBookingCombos(bookingId, dto);
  }

  @Post(':bookingId/pay')
  pay(@Param('bookingId') bookingId: string) {
    return this.bookingsService.pay(bookingId);
  }

  @Post(':bookingId/sepay')
  createSepayPayment(@Param('bookingId') bookingId: string) {
    return this.bookingsService.createSepayPayment(bookingId);
  }

  @Delete(':bookingId')
  cancel(@Param('bookingId') bookingId: string) {
    return this.bookingsService.cancel(bookingId);
  }
}
