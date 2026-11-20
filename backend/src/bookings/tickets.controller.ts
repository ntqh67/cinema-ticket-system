import { AuthGuard } from '../auth/guards/auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
/**
 * Mục đích: Tiếp nhận yêu cầu HTTP cho miền đặt vé, thanh toán và vé điện tử và chuyển xử lý sang service.
 */
import { Controller, Get, UseGuards } from '@nestjs/common';
import { BookingsService } from './bookings.service';

@UseGuards(AuthGuard)
@Controller('users')
// Lớp TicketsController nhận thao tác từ HTTP hoặc giao diện và chuyển chúng tới lớp nghiệp vụ phù hợp.
export class TicketsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Get('me/tickets')
  // Đọc và lọc dữ liệu cần thiết trong khối findUserTickets.
  findUserTickets(@CurrentUser() user: AuthenticatedUser) {
    return this.bookingsService.findUserTickets(user.id);
  }

  @Get('me/bookings')
  // Đọc và lọc dữ liệu cần thiết trong khối findUserBookings.
  findUserBookings(@CurrentUser() user: AuthenticatedUser) {
    return this.bookingsService.findUserBookings(user.id);
  }
}
