/**
 * Mục đích: Khai báo module NestJS và liên kết các thành phần của miền giữ ghế tạm thời.
 */
import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { RedisModule } from '../redis/redis.module';
import { SeatHoldsController } from './seat-holds.controller';
import { SeatHoldsService } from './seat-holds.service';

@Module({
  imports: [AuthModule, PrismaModule, RedisModule, RealtimeModule],
  controllers: [SeatHoldsController],
  providers: [SeatHoldsService],
  exports: [SeatHoldsService],
})
// Lớp SeatHoldsModule đăng ký controller, service và các module phụ thuộc với NestJS.
export class SeatHoldsModule {}
