import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';
import { TicketCheckinsController } from './ticket-checkins.controller';
import { TicketsController } from './tickets.controller';

@Module({
  imports: [PrismaModule],
  controllers: [BookingsController, TicketsController, TicketCheckinsController],
  providers: [BookingsService],
})
export class BookingsModule {}
