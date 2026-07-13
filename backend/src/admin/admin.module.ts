/**
 * Mục đích: Khai báo module NestJS và liên kết các thành phần của miền quản trị.
 */
import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [PrismaModule],
  controllers: [AdminController],
  providers: [AdminService],
})
// Lớp AdminModule đăng ký controller, service và các module phụ thuộc với NestJS.
export class AdminModule {}
