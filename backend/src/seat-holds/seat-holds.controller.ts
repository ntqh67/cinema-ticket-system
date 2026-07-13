/**
 * Mục đích: Tiếp nhận yêu cầu HTTP cho miền giữ ghế tạm thời và chuyển xử lý sang service.
 */
import { Body, Controller, Delete, Param, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CreateSeatHoldDto } from './dto/create-seat-hold.dto';
import { SeatHoldsService } from './seat-holds.service';

@ApiTags('seat-holds')
@Controller('seat-holds')
// Lớp SeatHoldsController nhận thao tác từ HTTP hoặc giao diện và chuyển chúng tới lớp nghiệp vụ phù hợp.
export class SeatHoldsController {
  constructor(private readonly seatHoldsService: SeatHoldsService) {}

  @Post()
  // Áp dụng quy tắc ghế và quyền sở hữu giữ ghế trong khối hold.
  hold(@Body() dto: CreateSeatHoldDto) {
    return this.seatHoldsService.hold(dto);
  }

  @Delete(':showtimeSeatId')
  // Xử lý việc gỡ bỏ, hủy hoặc giải phóng dữ liệu trong khối release.
  release(
    @Param('showtimeSeatId') showtimeSeatId: string,
    @Query('sessionId') sessionId: string,
    @Query('userId') userId?: string,
  ) {
    return this.seatHoldsService.release({ showtimeSeatId, sessionId, userId });
  }
}
