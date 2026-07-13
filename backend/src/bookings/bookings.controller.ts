import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Patch,
  Query,
  Headers,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingCombosDto } from './dto/update-booking-combos.dto';
import { OnlineDemoPaymentDto } from './dto/online-demo-payment.dto';

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

  @Get('vnpay-return')
  async handleVnpayReturn(
    @Query() query: Record<string, string>,
    @Res() response: Response,
  ) {
    const redirectUrl = await this.bookingsService.handleVnpayReturn(query);
    return response.redirect(redirectUrl);
  }

  @Get('vnpay-demo-return')
  async handleVnpayDemoReturn(
    @Query('ref') providerRef: string,
    @Res() response: Response,
  ) {
    const redirectUrl =
      await this.bookingsService.handleVnpayDemoReturn(providerRef);
    return response.redirect(redirectUrl);
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

  @Post(':bookingId/vnpay')
  createVnpayPayment(
    @Param('bookingId') bookingId: string,
    @Req() request: Request,
  ) {
    return this.bookingsService.createVnpayPayment(bookingId, request);
  }

  @Post(':bookingId/sepay')
  createSepayPayment(@Param('bookingId') bookingId: string) {
    return this.bookingsService.createSepayPayment(bookingId);
  }

  @Post(':bookingId/online-demo-pay')
  onlineDemoPay(
    @Param('bookingId') bookingId: string,
    @Body() body: OnlineDemoPaymentDto,
  ) {
    return this.bookingsService.onlineDemoPay(bookingId, body.provider);
  }

  @Delete(':bookingId')
  cancel(@Param('bookingId') bookingId: string) {
    return this.bookingsService.cancel(bookingId);
  }
}
