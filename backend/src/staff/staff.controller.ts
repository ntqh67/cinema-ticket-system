import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { StaffGuard } from './staff.guard';
import { StaffService } from './staff.service';
import { StaffCheckInDto } from './dto/check-in.dto';

@ApiTags('staff')
@ApiBearerAuth()
@UseGuards(StaffGuard)
@Controller('staff')
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  @Get('attendance')
  getAttendance(
    @Req() request: { user: { id: string; role: Role } },
    @Query('month') month?: string,
  ) {
    return this.staffService.getAttendance(request.user.id, month);
  }

  @Post('attendance/check-in')
  checkIn(
    @Req() request: { user: { id: string; role: Role } },
    @Body() dto: StaffCheckInDto,
  ) {
    return this.staffService.checkIn(request.user.id, dto.shiftCode);
  }

  @Post('attendance/check-out')
  checkOut(@Req() request: { user: { id: string; role: Role } }) {
    return this.staffService.checkOut(request.user.id);
  }
}
