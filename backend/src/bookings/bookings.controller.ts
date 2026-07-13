/**
 * Mục đích: Tiếp nhận yêu cầu HTTP cho miền đặt vé, thanh toán và vé điện tử và chuyển xử lý sang service.
 */
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
// Lớp BookingsController nhận thao tác từ HTTP hoặc giao diện và chuyển chúng tới lớp nghiệp vụ phù hợp.
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  // Tạo dữ liệu mới trong khối create và trả về kết quả đã chuẩn hóa.
  create(@Body() createBookingDto: CreateBookingDto) {
    return this.bookingsService.create(createBookingDto);
  }

  @Post('expire')
  // Xử lý việc gỡ bỏ, hủy hoặc giải phóng dữ liệu trong khối expirePendingBookings.
  expirePendingBookings() {
    return this.bookingsService.expirePendingBookings();
  }

  @Get('payment-methods')
  // Đọc và lọc dữ liệu cần thiết trong khối getPaymentMethods.
  getPaymentMethods() {
    return this.bookingsService.getPaymentMethods();
  }

  @Get('vnpay-return')
  // Điều phối sự kiện và phản hồi người dùng trong khối handleVnpayReturn.
  async handleVnpayReturn(
    @Query() query: Record<string, string>,
    @Res() response: Response,
  ) {
    const redirectUrl = await this.bookingsService.handleVnpayReturn(query);
    return response.redirect(redirectUrl);
  }

  @Get('vnpay-demo-return')
  // Điều phối sự kiện và phản hồi người dùng trong khối handleVnpayDemoReturn.
  async handleVnpayDemoReturn(
    @Query('ref') providerRef: string,
    @Res() response: Response,
  ) {
    const redirectUrl =
      await this.bookingsService.handleVnpayDemoReturn(providerRef);
    return response.redirect(redirectUrl);
  }

  @Post('sepay-webhook')
  // Điều phối sự kiện và phản hồi người dùng trong khối handleSepayWebhook.
  handleSepayWebhook(
    @Headers('authorization') authorization: string | undefined,
    @Body() payload: Record<string, unknown>,
  ) {
    return this.bookingsService.handleSepayWebhook(authorization, payload);
  }

  @Get('qr/:bookingQrToken')
  // Đọc và lọc dữ liệu cần thiết trong khối findBookingByQr.
  findBookingByQr(@Param('bookingQrToken') bookingQrToken: string) {
    return this.bookingsService.findBookingByQr(bookingQrToken);
  }

  @Post('qr/:bookingQrToken/check-in')
  // Kiểm tra điều kiện nghiệp vụ trong khối checkInBookingByQr trước khi tiếp tục.
  checkInBookingByQr(
    @Param('bookingQrToken') bookingQrToken: string,
    @Body() body: { checkedInBy?: string; notes?: string },
  ) {
    return this.bookingsService.checkInBookingByQr(bookingQrToken, body);
  }

  @Get()
  // Đọc và lọc dữ liệu cần thiết trong khối findAll.
  findAll() {
    return this.bookingsService.findAll();
  }

  @Get(':bookingId')
  // Đọc và lọc dữ liệu cần thiết trong khối findOne.
  findOne(@Param('bookingId') bookingId: string) {
    return this.bookingsService.findOne(bookingId);
  }

  @Get(':bookingId/tickets')
  // Đọc và lọc dữ liệu cần thiết trong khối findBookingTickets.
  findBookingTickets(@Param('bookingId') bookingId: string) {
    return this.bookingsService.findBookingTickets(bookingId);
  }

  @Patch(':bookingId/combos')
  // Cập nhật trạng thái hoặc dữ liệu trong khối updateBookingCombos.
  updateBookingCombos(
    @Param('bookingId') bookingId: string,
    @Body() dto: UpdateBookingCombosDto,
  ) {
    return this.bookingsService.updateBookingCombos(bookingId, dto);
  }

  @Post(':bookingId/pay')
  // Thực hiện bước thanh toán trong khối pay với kiểm tra trạng thái an toàn.
  pay(@Param('bookingId') bookingId: string) {
    return this.bookingsService.pay(bookingId);
  }

  @Post(':bookingId/vnpay')
  // Tạo dữ liệu mới trong khối createVnpayPayment và trả về kết quả đã chuẩn hóa.
  createVnpayPayment(
    @Param('bookingId') bookingId: string,
    @Req() request: Request,
  ) {
    return this.bookingsService.createVnpayPayment(bookingId, request);
  }

  @Post(':bookingId/sepay')
  // Tạo dữ liệu mới trong khối createSepayPayment và trả về kết quả đã chuẩn hóa.
  createSepayPayment(@Param('bookingId') bookingId: string) {
    return this.bookingsService.createSepayPayment(bookingId);
  }

  @Post(':bookingId/online-demo-pay')
  // Thực hiện bước thanh toán trong khối onlineDemoPay với kiểm tra trạng thái an toàn.
  onlineDemoPay(
    @Param('bookingId') bookingId: string,
    @Body() body: OnlineDemoPaymentDto,
  ) {
    return this.bookingsService.onlineDemoPay(bookingId, body.provider);
  }

  @Delete(':bookingId')
  // Kiểm tra điều kiện nghiệp vụ trong khối cancel trước khi tiếp tục.
  cancel(@Param('bookingId') bookingId: string) {
    return this.bookingsService.cancel(bookingId);
  }
}
