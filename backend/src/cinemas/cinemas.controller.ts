/**
 * Mục đích: Tiếp nhận yêu cầu đọc catalog rạp công khai và chuyển cho service.
 */
import { Controller, Get } from '@nestjs/common';
import { CinemasService } from './cinemas.service';

@Controller('cinemas')
// Lớp CinemasController chỉ công khai thao tác đọc, không chứa quyền ghi quản trị.
export class CinemasController {
  constructor(private readonly cinemasService: CinemasService) {}

  @Get()
  // Trả danh sách rạp Đà Nẵng cho trang khách hàng.
  findAll() {
    return this.cinemasService.findAll();
  }
}
