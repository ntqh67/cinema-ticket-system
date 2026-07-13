import {
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

export type BookingHoldOwner = {
  showtimeId: string;
  showtimeSeatIds: string[];
  userId: string;
};

const HOLD_SECONDS = 5 * 60;
const HOLD_PREFIX = 'seat_hold';
const UPSERT_OWNED_HOLD_SCRIPT = `
local existing = redis.call('GET', KEYS[1])
if existing then
  local hold = cjson.decode(existing)
  local ownedBySession = ARGV[1] ~= '' and hold.sessionId == ARGV[1]
  local ownedByUser = ARGV[2] ~= '' and hold.userId == ARGV[2]
  if not ownedBySession and not ownedByUser then return 0 end
end
redis.call('SET', KEYS[1], ARGV[3], 'EX', ARGV[4])
return 1
`;
const RELEASE_OWNED_HOLD_SCRIPT = `
local existing = redis.call('GET', KEYS[1])
if not existing then return 0 end
local hold = cjson.decode(existing)
local ownedBySession = ARGV[1] ~= '' and hold.sessionId == ARGV[1]
local ownedByUser = ARGV[2] ~= '' and hold.userId == ARGV[2]
if not ownedBySession and not ownedByUser then return -1 end
return redis.call('DEL', KEYS[1])
`;
const BIND_HOLDS_TO_USER_SCRIPT = `
local holds = {}
for index, key in ipairs(KEYS) do
  local existing = redis.call('GET', key)
  if not existing then return 0 end
  local hold = cjson.decode(existing)
  local ownedBySession = ARGV[1] ~= '' and hold.sessionId == ARGV[1]
  local ownedByUser = hold.userId == ARGV[2]
  if hold.showtimeId ~= ARGV[3] or (not ownedBySession and not ownedByUser) then
    return 0
  end
  holds[index] = hold
end
for index, key in ipairs(KEYS) do
  holds[index].userId = ARGV[2]
  holds[index].expiresAt = ARGV[4]
  redis.call('SET', key, cjson.encode(holds[index]), 'EX', ARGV[5])
end
return 1
`;
const RELEASE_BOOKING_HOLDS_SCRIPT = `
local released = 0
for _, key in ipairs(KEYS) do
  local existing = redis.call('GET', key)
  if existing then
    local hold = cjson.decode(existing)
    if hold.showtimeId == ARGV[1] and hold.userId == ARGV[2] then
      released = released + redis.call('DEL', key)
    end
  end
end
return released
`;

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

    const expiresAt = new Date(Date.now() + HOLD_SECONDS * 1000).toISOString();
    const payload: SeatHoldPayload = {
      showtimeId: dto.showtimeId,
      showtimeSeatId: dto.showtimeSeatId,
      sessionId: dto.sessionId,
      userId: dto.userId,
      expiresAt,
    };
    const key = this.key(dto.showtimeId, dto.showtimeSeatId);
    const saved = await this.redis.eval(
      UPSERT_OWNED_HOLD_SCRIPT,
      [key],
      [
        dto.sessionId,
        dto.userId || '',
        JSON.stringify(payload),
        String(HOLD_SECONDS),
      ],
    );

    if (saved !== 1) {
      throw new ConflictException('Seat is temporarily held by another customer');
    }

    return { held: true, expiresAt, ttlSeconds: HOLD_SECONDS };
  }

  async release(params: {
    showtimeSeatId: string;
    sessionId?: string;
    userId?: string;
  }) {
    const seat = await this.prisma.showtimeSeat.findUnique({
      where: { id: params.showtimeSeatId },
      select: { showtimeId: true },
    });
    if (!seat) return { released: false };
    const existing = await this.getHold(seat.showtimeId, params.showtimeSeatId);
    if (!existing) return { released: false };
    const released = await this.redis.eval(
      RELEASE_OWNED_HOLD_SCRIPT,
      [this.key(existing.showtimeId, params.showtimeSeatId)],
      [params.sessionId || '', params.userId || ''],
    );
    if (released === -1) {
      throw new ConflictException('Cannot release another customer hold');
    }
    return { released: released === 1 };
  }

  async listByShowtime(showtimeId: string, showtimeSeatIds: string[]) {
    const keys = showtimeSeatIds.map((showtimeSeatId) =>
      this.key(showtimeId, showtimeSeatId),
    );
    const values = await this.redis.mGet(keys);
    const holds: SeatHoldPayload[] = [];
    for (const [index, value] of values.entries()) {
      if (!value) continue;
      try {
        holds.push(JSON.parse(value) as SeatHoldPayload);
      } catch {
        await this.redis.del(keys[index]);
      }
    }
    return holds;
  }

  async bindHoldsToUser(params: {
    showtimeId: string;
    showtimeSeatIds: string[];
    sessionId: string;
    userId: string;
  }) {
    const expiresAt = new Date(Date.now() + HOLD_SECONDS * 1000).toISOString();
    const keys = params.showtimeSeatIds.map((showtimeSeatId) =>
      this.key(params.showtimeId, showtimeSeatId),
    );
    const bound = await this.redis.eval(BIND_HOLDS_TO_USER_SCRIPT, keys, [
      params.sessionId,
      params.userId,
      params.showtimeId,
      expiresAt,
      String(HOLD_SECONDS),
    ]);

    if (bound !== 1) {
      throw new ConflictException('One or more selected seats are no longer held');
    }
  }

  async verifyBookingHolds(params: {
    userId: string;
    showtimeId: string;
    showtimeSeatIds: string[];
  }) {
    for (const showtimeSeatId of params.showtimeSeatIds) {
      const hold = await this.getHold(params.showtimeId, showtimeSeatId);
      if (
        !hold ||
        hold.showtimeId !== params.showtimeId ||
        hold.userId !== params.userId
      ) {
        throw new ConflictException('One or more seats are no longer held');
      }
    }
  }

  async releaseBookingHolds(owners: BookingHoldOwner[]) {
    let released = 0;
    for (const owner of owners) {
      const keys = owner.showtimeSeatIds.map((showtimeSeatId) =>
        this.key(owner.showtimeId, showtimeSeatId),
      );
      const result = await this.redis.eval(RELEASE_BOOKING_HOLDS_SCRIPT, keys, [
        owner.showtimeId,
        owner.userId,
      ]);
      if (typeof result === 'number') released += result;
    }
    return released;
  }

  private async getHold(showtimeId: string, showtimeSeatId: string) {
    const key = this.key(showtimeId, showtimeSeatId);
    const value = await this.redis.get(key);
    if (!value) return null;
    try {
      return JSON.parse(value) as SeatHoldPayload;
    } catch {
      await this.redis.del(key);
      return null;
    }
  }

  private key(showtimeId: string, showtimeSeatId: string) {
    return `${HOLD_PREFIX}:${showtimeId}:${showtimeSeatId}`;
  }

}
