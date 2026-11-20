/**
 * Mục đích: Dọn token và phiên đã hết hạn theo lô nhỏ để bảng auth không phình mãi.
 */
import {
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CLEANUP_BATCH_SIZE, CLEANUP_INTERVAL_MS } from './auth.constants';

@Injectable()
export class AuthCleanupJob implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AuthCleanupJob.name);

  private timer?: NodeJS.Timeout;

  constructor(private readonly prisma: PrismaService) {}

  // Lên lịch dọn định kỳ; unref để không giữ process sống khi tắt ứng dụng.
  onModuleInit(): void {
    this.timer = setInterval(
      () => void this.cleanExpired(),
      CLEANUP_INTERVAL_MS,
    );
    this.timer.unref();
  }

  onModuleDestroy(): void {
    clearInterval(this.timer);
  }

  // Mỗi phút xóa tối đa CLEANUP_BATCH_SIZE dòng hết hạn cho từng bảng.
  async cleanExpired(): Promise<void> {
    const now = new Date();
    try {
      await this.deleteExpired(
        (take) =>
          this.prisma.refreshToken.findMany({
            where: { expiresAt: { lt: now } },
            select: { id: true },
            take,
          }),
        (ids) =>
          this.prisma.refreshToken.deleteMany({ where: { id: { in: ids } } }),
      );
      await this.deleteExpired(
        (take) =>
          this.prisma.passwordResetToken.findMany({
            where: { expiresAt: { lt: now } },
            select: { id: true },
            take,
          }),
        (ids) =>
          this.prisma.passwordResetToken.deleteMany({
            where: { id: { in: ids } },
          }),
      );
      await this.deleteExpired(
        (take) =>
          this.prisma.authSession.findMany({
            where: { expiresAt: { lt: now } },
            select: { id: true },
            take,
          }),
        (ids) =>
          this.prisma.authSession.deleteMany({ where: { id: { in: ids } } }),
      );
    } catch {
      this.logger.error('Dọn token hết hạn thất bại');
    }
  }

  // Xóa theo lô: tìm tối đa CLEANUP_BATCH_SIZE id rồi xóa đúng các id đó.
  private async deleteExpired(
    find: (take: number) => Promise<{ id: string }[]>,
    remove: (ids: string[]) => Promise<unknown>,
  ): Promise<void> {
    const rows = await find(CLEANUP_BATCH_SIZE);
    if (rows.length) await remove(rows.map((row) => row.id));
  }
}
