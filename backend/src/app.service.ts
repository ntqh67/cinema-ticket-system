/**
 * Mục đích: Cài đặt nghiệp vụ khởi tạo và tiện ích dùng chung; dữ liệu bền vững được truy cập qua Prisma.
 */
import { Injectable } from '@nestjs/common';

@Injectable()
// Lớp AppService tập trung các quy tắc nghiệp vụ và phối hợp truy cập dữ liệu.
export class AppService {
  // Đọc và lọc dữ liệu cần thiết trong khối getHello.
  getHello(): string {
    return 'Hello World!';
  }
}
