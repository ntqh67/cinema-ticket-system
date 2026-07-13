/**
 * Mục đích: Khai báo module NestJS và liên kết các thành phần của miền sơ đồ và trạng thái ghế.
 */
import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SeatHoldsModule } from '../seat-holds/seat-holds.module';
import { SeatsController } from './seats.controller';
import { SeatsService } from './seats.service';

@Module({
  imports: [PrismaModule, SeatHoldsModule],
  controllers: [SeatsController],
  providers: [SeatsService],
})
// Lớp SeatsModule đăng ký controller, service và các module phụ thuộc với NestJS.
export class SeatsModule {}
