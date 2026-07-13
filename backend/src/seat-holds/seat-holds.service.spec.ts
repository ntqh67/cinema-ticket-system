import { ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { SeatHoldsService } from './seat-holds.service';

describe('SeatHoldsService', () => {
  const findUnique = jest.fn();
  const evalRedis = jest.fn();
  const get = jest.fn();
  const mGet = jest.fn();
  const del = jest.fn();

  const prisma = {
    showtimeSeat: { findUnique },
  } as unknown as PrismaService;
  const redis = {
    eval: evalRedis,
    get,
    mGet,
    del,
  } as unknown as RedisService;

  const service = new SeatHoldsService(prisma, redis);
  const dto = {
    showtimeId: 'showtime-1',
    showtimeSeatId: 'showtime-seat-1',
    sessionId: 'session-1',
    userId: 'user-1',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('holds an available seat with one atomic Redis command', async () => {
    findUnique.mockResolvedValue({
      id: dto.showtimeSeatId,
      showtimeId: dto.showtimeId,
      status: 'AVAILABLE',
    });
    evalRedis.mockResolvedValue(1);

    const result = await service.hold(dto);

    expect(result.held).toBe(true);
    expect(result.ttlSeconds).toBe(300);
    expect(evalRedis).toHaveBeenCalledTimes(1);
    expect(evalRedis.mock.calls[0][1]).toEqual([
      `seat_hold:${dto.showtimeId}:${dto.showtimeSeatId}`,
    ]);
  });

  it('rejects a seat held by another owner', async () => {
    findUnique.mockResolvedValue({
      id: dto.showtimeSeatId,
      showtimeId: dto.showtimeId,
      status: 'AVAILABLE',
    });
    evalRedis.mockResolvedValue(0);

    await expect(service.hold(dto)).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects a booked or blocked database seat before Redis', async () => {
    findUnique.mockResolvedValue({
      id: dto.showtimeSeatId,
      showtimeId: dto.showtimeId,
      status: 'BOOKED',
    });

    await expect(service.hold(dto)).rejects.toBeInstanceOf(ConflictException);
    expect(evalRedis).not.toHaveBeenCalled();
  });

  it('binds all selected seats to the user atomically', async () => {
    evalRedis.mockResolvedValue(1);

    await service.bindHoldsToUser({
      showtimeId: dto.showtimeId,
      showtimeSeatIds: ['seat-1', 'seat-2'],
      sessionId: dto.sessionId,
      userId: dto.userId,
    });

    expect(evalRedis).toHaveBeenCalledTimes(1);
    expect(evalRedis.mock.calls[0][1]).toEqual([
      'seat_hold:showtime-1:seat-1',
      'seat_hold:showtime-1:seat-2',
    ]);
  });
});
