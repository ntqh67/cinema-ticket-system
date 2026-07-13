/**
 * Mục đích: Khai báo module NestJS và liên kết các thành phần của miền mô hình và dữ liệu PostgreSQL.
 */
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
// Lớp PrismaModule đăng ký controller, service và các module phụ thuộc với NestJS.
export class PrismaModule {}
