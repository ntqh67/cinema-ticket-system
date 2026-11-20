import { AuthGuard } from '../auth/guards/auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
/**
 * Mục đích: Tiếp nhận yêu cầu HTTP cho miền đặt vé, thanh toán và vé điện tử và chuyển xử lý sang service.
 */
import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { CheckInTicketDto } from './dto/check-in-ticket.dto';

@UseGuards(AuthGuard, RolesGuard)
@Roles(Role.STAFF, Role.ADMIN)
@Controller('tickets')
// Lớp TicketCheckinsController nhận thao tác từ HTTP hoặc giao diện và chuyển chúng tới lớp nghiệp vụ phù hợp.
export class TicketCheckinsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Get('qr/:qrToken')
  // Đọc và lọc dữ liệu cần thiết trong khối findByQr.
  findByQr(@Param('qrToken') qrToken: string) {
    return this.bookingsService.findTicketByQr(qrToken);
  }

  @Post('qr/:qrToken/check-in')
  // Kiểm tra điều kiện nghiệp vụ trong khối checkIn trước khi tiếp tục.
  checkIn(
    @Param('qrToken') qrToken: string,
    @Body() checkInTicketDto: CheckInTicketDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.bookingsService.checkInTicket(
      qrToken,
      checkInTicketDto,
      user.id,
    );
  }
}
