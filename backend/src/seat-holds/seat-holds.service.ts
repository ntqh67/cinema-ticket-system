import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { CreateSeatHoldDto } from './dto/create-seat-hold.dto';

export type SeatHoldPayload = {
  showtimeId: string;
  showtimeSeatId: string;
  sessionId: string;
  userId?: string;
  expiresAt: string;
};

const HOLD_SECONDS = 5 * 60;
const HOLD_PREFIX = 'seat_hold';

@Injectable()
export class SeatHoldsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async hold(dto: CreateSeatHoldDto) {
    const showtimeSeat = await this.prisma.showtimeSeat.findUnique({
      where: { id: dto.showtimeSeatId },
      select: { id: true, showtimeId: true, status: true },
    });

    if (!showtimeSeat || showtimeSeat.showtimeId !== dto.showtimeId) {
      throw new NotFoundException('Showtime seat not found');
    }

    if (showtimeSeat.status !== 'AVAILABLE') {
      throw new ConflictException('Seat is not available');
    }

    const existing = await this.getHold(dto.showtimeSeatId);
    if (existing && !this.isOwner(existing, dto.sessionId, dto.userId)) {
      throw new ConflictException('Seat is temporarily held by another customer');
    }

    const expiresAt = new Date(Date.now() + HOLD_SECONDS * 1000).toISOString();
    const payload: SeatHoldPayload = {
      showtimeId: dto.showtimeId,
      showtimeSeatId: dto.showtimeSeatId,
      sessionId: dto.sessionId,
      userId: dto.userId,
      expiresAt,
    };
    const key = this.key(dto.showtimeId, dto.showtimeSeatId);
    const saved = existing
      ? await this.redis.setEx(key, HOLD_SECONDS, JSON.stringify(payload))
      : await this.redis.setNxEx(key, HOLD_SECONDS, JSON.stringify(payload));

    if (!saved) {
      throw new ConflictException('Seat is temporarily held by another customer');
    }

    return { held: true, expiresAt, ttlSeconds: HOLD_SECONDS };
  }

  async release(params: {
    showtimeSeatId: string;
    sessionId?: string;
    userId?: string;
  }) {
    const existing = await this.getHold(params.showtimeSeatId);
    if (!existing) return { released: false };
    if (!this.isOwner(existing, params.sessionId, params.userId)) {
      throw new ConflictException('Cannot release another customer hold');
    }
    await this.redis.del(this.key(existing.showtimeId, params.showtimeSeatId));
    return { released: true };
  }

  async listByShowtime(showtimeId: string) {
    const keys = await this.redis.keys(`${HOLD_PREFIX}:${showtimeId}:*`);
    const holds: SeatHoldPayload[] = [];
    for (const key of keys) {
      const value = await this.redis.get(key);
      if (!value) continue;
      try {
        holds.push(JSON.parse(value) as SeatHoldPayload);
      } catch {
        await this.redis.del(key);
      }
    }
    return holds;
  }

  async bindHoldsToUser(params: {
    showtimeId: string;
    showtimeSeatIds: string[];
    sessionId?: string;
    userId: string;
  }) {
    if (!params.sessionId) {
      throw new BadRequestException('Seat hold session is required');
    }

    for (const showtimeSeatId of params.showtimeSeatIds) {
      const hold = await this.getHold(showtimeSeatId);
      if (
        !hold ||
        hold.showtimeId !== params.showtimeId ||
        !this.isOwner(hold, params.sessionId, params.userId)
      ) {
        throw new ConflictException('One or more selected seats are no longer held');
      }
      await this.redis.setEx(
        this.key(params.showtimeId, showtimeSeatId),
        HOLD_SECONDS,
        JSON.stringify({ ...hold, userId: params.userId }),
      );
    }
  }

  async verifyBookingHolds(params: {
    userId: string;
    showtimeId: string;
    showtimeSeatIds: string[];
  }) {
    for (const showtimeSeatId of params.showtimeSeatIds) {
      const hold = await this.getHold(showtimeSeatId);
      if (
        !hold ||
        hold.showtimeId !== params.showtimeId ||
        hold.userId !== params.userId
      ) {
        throw new ConflictException('One or more seats are no longer held');
      }
    }
  }

  async releaseMany(showtimeSeatIds: string[]) {
    const keys: string[] = [];
    for (const showtimeSeatId of showtimeSeatIds) {
      const existing = await this.getHold(showtimeSeatId);
      if (existing) keys.push(this.key(existing.showtimeId, showtimeSeatId));
    }
    await this.redis.del(...keys);
  }

  private async getHold(showtimeSeatId: string) {
    const keys = await this.redis.keys(`${HOLD_PREFIX}:*:${showtimeSeatId}`);
    if (keys.length === 0) return null;
    const value = await this.redis.get(keys[0]);
    if (!value) return null;
    try {
      return JSON.parse(value) as SeatHoldPayload;
    } catch {
      await this.redis.del(keys[0]);
      return null;
    }
  }

  private key(showtimeId: string, showtimeSeatId: string) {
    return `${HOLD_PREFIX}:${showtimeId}:${showtimeSeatId}`;
  }

  private isOwner(
    hold: SeatHoldPayload,
    sessionId?: string,
    userId?: string,
  ) {
    return (
      (!!sessionId && hold.sessionId === sessionId) ||
      (!!userId && hold.userId === userId)
    );
  }
}
