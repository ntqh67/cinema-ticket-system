/**
 * Mục đích: Khai báo module NestJS và liên kết các thành phần của miền xác thực người dùng.
 */
import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  controllers: [AuthController],
  providers: [AuthService],
})
// Lớp AuthModule đăng ký controller, service và các module phụ thuộc với NestJS.
export class AuthModule {}
