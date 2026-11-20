import { PrismaModule } from '../prisma/prisma.module';
import { AuthGuard } from './guards/auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { OptionalAuthGuard } from './guards/optional-auth.guard';
/**
 * Mục đích: Khai báo module NestJS và liên kết các thành phần của miền xác thực người dùng.
 */
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthCleanupJob } from './auth-cleanup.job';
import { MailService } from './mail.service';
import { TokenService } from './token.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  // Throttler đăng ký ngay tại miền auth vì chỉ các endpoint auth dùng ThrottlerGuard.
  imports: [
    PrismaModule,
    ConfigModule,
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
  ],
  exports: [AuthService, AuthGuard, RolesGuard, OptionalAuthGuard],
  controllers: [AuthController],
  providers: [
    AuthService,
    TokenService,
    MailService,
    AuthCleanupJob,
    AuthGuard,
    RolesGuard,
    OptionalAuthGuard,
  ],
})
// Lớp AuthModule đăng ký controller, service và các module phụ thuộc với NestJS.
export class AuthModule {}
