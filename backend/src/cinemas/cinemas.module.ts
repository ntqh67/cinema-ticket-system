/**
 * Mục đích: Đăng ký miền catalog rạp công khai trong modular monolith.
 */
import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CinemasController } from './cinemas.controller';
import { CinemasService } from './cinemas.service';

@Module({
  imports: [PrismaModule],
  controllers: [CinemasController],
  providers: [CinemasService],
})
// Lớp CinemasModule giữ API đọc rạp tách khỏi miền quản trị.
export class CinemasModule {}
