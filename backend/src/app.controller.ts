/**
 * Mục đích: Tiếp nhận yêu cầu HTTP cho miền khởi tạo và tiện ích dùng chung và chuyển xử lý sang service.
 */
import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
// Lớp AppController nhận thao tác từ HTTP hoặc giao diện và chuyển chúng tới lớp nghiệp vụ phù hợp.
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  // Đọc và lọc dữ liệu cần thiết trong khối getHello.
  getHello(): string {
    return this.appService.getHello();
  }
}
