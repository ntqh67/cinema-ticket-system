import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { BookingsService } from './bookings.service';

@ApiTags('admin-bookings')
@ApiBearerAuth()
@Controller('admin/bookings')
@UseGuards(AuthGuard, RolesGuard)
@Roles(Role.ADMIN)
// Tách giám sát toàn hệ thống khỏi danh sách booking customer.
export class AdminBookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Get()
  // Admin đọc toàn bộ booking qua nghiệp vụ hiện có.
  findAll() {
    return this.bookingsService.findAll();
  }
  @Post('expire')
  // Chỉ Admin chủ động kích hoạt dọn các booking đã hết hạn.
  expirePendingBookings() {
    return this.bookingsService.expirePendingBookings();
  }
}
