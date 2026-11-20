import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../auth/guards/auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { CheckInTicketDto } from './dto/check-in-ticket.dto';
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
  UseGuards,
} from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { ApplyBookingPromotionDto } from './dto/apply-booking-promotion.dto';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingCombosDto } from './dto/update-booking-combos.dto';

@ApiTags('bookings')
@ApiBearerAuth()
@Controller('bookings')
// Điều phối HTTP và chuyển danh tính phiên sang nghiệp vụ đúng miền.
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  @UseGuards(AuthGuard)
  // Tạo booking cho tài khoản trong phiên, không nhận chủ booking từ DTO.
  create(
    @Body() createBookingDto: CreateBookingDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.bookingsService.create(createBookingDto, user.id);
  }

  @Get('payment-methods')
  // Công khai các phương thức thanh toán hiện được cấu hình.
  getPaymentMethods() {
    return this.bookingsService.getPaymentMethods();
  }

  @Post('sepay-webhook')
  // Callback sử dụng xác thực riêng của SePay trong service.
  handleSepayWebhook(
    @Headers('authorization') authorization: string | undefined,
    @Body() payload: Record<string, unknown>,
  ) {
    return this.bookingsService.handleSepayWebhook(authorization, payload);
  }

  @Get('qr/:bookingQrToken')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.STAFF, Role.ADMIN)
  // Chỉ nhân viên soát vé hoặc Admin được tra cứu QR bất kỳ.
  findBookingByQr(@Param('bookingQrToken') bookingQrToken: string) {
    return this.bookingsService.findBookingByQr(bookingQrToken);
  }

  @Post('qr/:bookingQrToken/check-in')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.STAFF, Role.ADMIN)
  // Lấy người soát vé từ phiên để ghi nhận lịch sử chính xác.
  checkInBookingByQr(
    @Param('bookingQrToken') bookingQrToken: string,
    @Body() body: CheckInTicketDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.bookingsService.checkInBookingByQr(
      bookingQrToken,
      body,
      user.id,
    );
  }

  @Get()
  @UseGuards(AuthGuard)
  // Customer chỉ xem danh sách booking của phiên đang đăng nhập.
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.bookingsService.findUserBookings(user.id);
  }

  @Get(':bookingId/payment-status')
  @UseGuards(AuthGuard)
  // Chuyển danh tính phiên để service kiểm tra chủ booking trước khi đọc payment.
  getPaymentStatus(
    @Param('bookingId') bookingId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.bookingsService.getPaymentStatus(bookingId, user.id);
  }

  @Get(':bookingId')
  @UseGuards(AuthGuard)
  // Đọc chi tiết booking sau khi service đối chiếu chủ sở hữu.
  findOne(
    @Param('bookingId') bookingId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.bookingsService.findOne(bookingId, user.id);
  }

  @Get(':bookingId/tickets')
  @UseGuards(AuthGuard)
  // Giới hạn vé được trả về theo chủ booking đang đăng nhập.
  findBookingTickets(
    @Param('bookingId') bookingId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.bookingsService.findBookingTickets(bookingId, user.id);
  }

  @Patch(':bookingId/combos')
  @UseGuards(AuthGuard)
  // Chuyển danh tính phiên cùng lựa chọn combo để kiểm tra quyền sở hữu.
  updateBookingCombos(
    @Param('bookingId') bookingId: string,
    @Body() dto: UpdateBookingCombosDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.bookingsService.updateBookingCombos(bookingId, dto, user.id);
  }

  @Patch(':bookingId/promotion')
  @UseGuards(AuthGuard)
  // Nhận mã khách nhập và giao toàn bộ việc tính giá cho BookingsService.
  applyPromotion(
    @Param('bookingId') bookingId: string,
    @Body() dto: ApplyBookingPromotionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.bookingsService.applyPromotion(bookingId, dto, user.id);
  }

  @Post(':bookingId/pay')
  @UseGuards(AuthGuard)
  // Chỉ chủ booking được yêu cầu phát hành vé theo quy tắc thanh toán hiện có.
  pay(
    @Param('bookingId') bookingId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.bookingsService.pay(bookingId, user.id);
  }

  @Post(':bookingId/sepay')
  @UseGuards(AuthGuard)
  // Chỉ chủ booking được tạo giao dịch SePay.
  createSepayPayment(
    @Param('bookingId') bookingId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.bookingsService.createSepayPayment(bookingId, user.id);
  }

  @Delete(':bookingId')
  @UseGuards(AuthGuard)
  // Chỉ chủ booking được yêu cầu hủy và giải phóng ghế.
  cancel(
    @Param('bookingId') bookingId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.bookingsService.cancel(bookingId, user.id);
  }
}
