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
export class SeatHoldsModule {}
