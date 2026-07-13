/**
 * Mục đích: Khai báo module NestJS và liên kết các thành phần của miền combo bắp nước.
 */
import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ConcessionsController } from './concessions.controller';
import { ConcessionsService } from './concessions.service';

@Module({
  imports: [PrismaModule],
  controllers: [ConcessionsController],
  providers: [ConcessionsService],
})
// Lớp ConcessionsModule đăng ký controller, service và các module phụ thuộc với NestJS.
export class ConcessionsModule {}
