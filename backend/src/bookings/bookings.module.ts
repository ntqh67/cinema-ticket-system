/**
 * Mục đích: Khai báo module NestJS và liên kết các thành phần của miền đặt vé, thanh toán và vé điện tử.
 */
import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SeatHoldsModule } from '../seat-holds/seat-holds.module';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';
import { TicketCheckinsController } from './ticket-checkins.controller';
import { TicketsController } from './tickets.controller';

@Module({
  imports: [PrismaModule, SeatHoldsModule],
  controllers: [BookingsController, TicketsController, TicketCheckinsController],
  providers: [BookingsService],
})
// Lớp BookingsModule đăng ký controller, service và các module phụ thuộc với NestJS.
export class BookingsModule {}
