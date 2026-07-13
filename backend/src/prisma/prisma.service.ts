/**
 * Mục đích: Cài đặt nghiệp vụ mô hình và dữ liệu PostgreSQL; dữ liệu bền vững được truy cập qua Prisma.
 */
import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
// Lớp PrismaService tập trung các quy tắc nghiệp vụ và phối hợp truy cập dữ liệu.
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  constructor() {
    super();
  }

  // Thực hiện trách nhiệm riêng của khối onModuleDestroy.
  async onModuleDestroy() {
    await this.$disconnect();
  }
}
