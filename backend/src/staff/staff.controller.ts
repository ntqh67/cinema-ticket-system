import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { StaffService } from './staff.service';
import { StaffCheckInDto } from './dto/check-in.dto';

@ApiTags('staff')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Roles(Role.STAFF)
@Controller('staff')
// Điều phối HTTP và chuyển danh tính phiên sang nghiệp vụ đúng miền.
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  @Get('attendance')
  // Đọc chấm công của nhân viên trong phiên hiện tại.
  getAttendance(
    @CurrentUser() user: AuthenticatedUser,
    @Query('month') month?: string,
  ) {
    return this.staffService.getAttendance(user.id, month);
  }

  @Post('attendance/check-in')
  // Ghi nhận vào ca cho nhân viên đã được xác thực.
  checkIn(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: StaffCheckInDto,
  ) {
    return this.staffService.checkIn(user.id, dto.shiftCode);
  }

  @Post('attendance/check-out')
  // Ghi nhận ra ca cho nhân viên trong phiên hiện tại.
  checkOut(@CurrentUser() user: AuthenticatedUser) {
    return this.staffService.checkOut(user.id);
  }
}
