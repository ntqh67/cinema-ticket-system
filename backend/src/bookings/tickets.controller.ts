/**
 * Mục đích: Tiếp nhận yêu cầu HTTP cho miền đặt vé, thanh toán và vé điện tử và chuyển xử lý sang service.
 */
import { Controller, Get, Param } from '@nestjs/common';
import { BookingsService } from './bookings.service';

@Controller('users')
// Lớp TicketsController nhận thao tác từ HTTP hoặc giao diện và chuyển chúng tới lớp nghiệp vụ phù hợp.
export class TicketsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Get(':userId/tickets')
  // Đọc và lọc dữ liệu cần thiết trong khối findUserTickets.
  findUserTickets(@Param('userId') userId: string) {
    return this.bookingsService.findUserTickets(userId);
  }

  @Get(':userId/bookings')
  // Đọc và lọc dữ liệu cần thiết trong khối findUserBookings.
  findUserBookings(@Param('userId') userId: string) {
    return this.bookingsService.findUserBookings(userId);
  }
}
