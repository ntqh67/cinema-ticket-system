import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SeatsController } from './seats.controller';
import { SeatsService } from './seats.service';

@Module({
  imports: [PrismaModule],
  controllers: [SeatsController],
  providers: [SeatsService],
})
export class SeatsModule {}
