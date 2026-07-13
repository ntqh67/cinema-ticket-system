/**
 * Mục đích: Cài đặt nghiệp vụ combo bắp nước; dữ liệu bền vững được truy cập qua Prisma.
 */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
// Lớp ConcessionsService tập trung các quy tắc nghiệp vụ và phối hợp truy cập dữ liệu.
export class ConcessionsService {
  constructor(private readonly prisma: PrismaService) {}

  // Kiểm tra điều kiện nghiệp vụ trong khối listActiveCombos trước khi tiếp tục.
  listActiveCombos() {
    return this.prisma.concessionCombo.findMany({
      where: { isActive: true },
      orderBy: { price: 'asc' },
    });
  }
}
