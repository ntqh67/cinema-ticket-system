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
export class SeatsModule {}
