/**
 * Mục đích: Tiếp nhận yêu cầu HTTP cho miền đặt vé, thanh toán và vé điện tử và chuyển xử lý sang service.
 */
import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { CheckInTicketDto } from './dto/check-in-ticket.dto';

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
  ) {
    return this.bookingsService.checkInTicket(qrToken, checkInTicketDto);
  }
}
