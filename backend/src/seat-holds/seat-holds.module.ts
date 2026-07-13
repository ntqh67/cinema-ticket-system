/**
 * Mục đích: Khai báo module NestJS và liên kết các thành phần của miền giữ ghế tạm thời.
 */
import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';
import { SeatHoldsController } from './seat-holds.controller';
import { SeatHoldsService } from './seat-holds.service';

@Module({
  imports: [PrismaModule, RedisModule],
  controllers: [SeatHoldsController],
  providers: [SeatHoldsService],
  exports: [SeatHoldsService],
})
// Lớp SeatHoldsModule đăng ký controller, service và các module phụ thuộc với NestJS.
export class SeatHoldsModule {}
