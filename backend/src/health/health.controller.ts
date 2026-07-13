/**
 * Mục đích: Tiếp nhận yêu cầu HTTP cho miền kiểm tra tình trạng hệ thống và chuyển xử lý sang service.
 */
import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('health')
// Lớp HealthController nhận thao tác từ HTTP hoặc giao diện và chuyển chúng tới lớp nghiệp vụ phù hợp.
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  // Kiểm tra điều kiện nghiệp vụ trong khối check trước khi tiếp tục.
  async check() {
    await this.prisma.$queryRaw`SELECT 1`;
    return {
      status: 'ok',
      database: 'connected',
    };
  }
}
