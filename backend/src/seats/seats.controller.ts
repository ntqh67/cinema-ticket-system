/**
 * Mục đích: Tiếp nhận yêu cầu HTTP cho miền sơ đồ và trạng thái ghế và chuyển xử lý sang service.
 */
import { Controller, Get, Param, Query } from '@nestjs/common';
import { SeatsService } from './seats.service';

@Controller('showtimes')
// Lớp SeatsController nhận thao tác từ HTTP hoặc giao diện và chuyển chúng tới lớp nghiệp vụ phù hợp.
export class SeatsController {
  constructor(private readonly seatsService: SeatsService) {}

  @Get(':showtimeId/seats')
  // Dựng phần giao diện tương ứng trong khối findByShowtime.
  findByShowtime(
    @Param('showtimeId') showtimeId: string,
    @Query('sessionId') sessionId?: string,
    @Query('userId') userId?: string,
  ) {
    return this.seatsService.findByShowtime(showtimeId, { sessionId, userId });
  }
}
