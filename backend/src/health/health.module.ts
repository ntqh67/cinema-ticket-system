/**
 * Mục đích: Khai báo module NestJS và liên kết các thành phần của miền kiểm tra tình trạng hệ thống.
 */
import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [HealthController],
})
// Lớp HealthModule đăng ký controller, service và các module phụ thuộc với NestJS.
export class HealthModule {}
