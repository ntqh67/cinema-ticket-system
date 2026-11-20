import { AuthModule } from '../auth/auth.module';
/**
 * Mục đích: Khai báo module NestJS và liên kết các thành phần của miền quản trị.
 */
import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { MoviesModule } from '../movies/movies.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [AuthModule, PrismaModule, MoviesModule],
  controllers: [AdminController],
  providers: [AdminService],
})
// Lớp AdminModule đăng ký controller, service và các module phụ thuộc với NestJS.
export class AdminModule {}
