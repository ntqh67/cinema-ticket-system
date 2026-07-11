import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ConcessionsService {
  constructor(private readonly prisma: PrismaService) {}

  listActiveCombos() {
    return this.prisma.concessionCombo.findMany({
      where: { isActive: true },
      orderBy: { price: 'asc' },
    });
  }
}
