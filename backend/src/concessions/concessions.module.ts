import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ConcessionsController } from './concessions.controller';
import { ConcessionsService } from './concessions.service';

@Module({
  imports: [PrismaModule],
  controllers: [ConcessionsController],
  providers: [ConcessionsService],
})
export class ConcessionsModule {}
