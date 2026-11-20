/**
 * Mục đích: Kiểm thử các hành vi và ràng buộc quan trọng của miền giữ ghế tạm thời.
 */
import { ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { SeatEventsGateway } from '../realtime/seat-events.gateway';
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

  const publishSeatsChanged = jest.fn();
  const seatEvents = {
    publishSeatsChanged,
  } as unknown as SeatEventsGateway;

  const service = new SeatHoldsService(prisma, redis, seatEvents);
  const dto = {
    showtimeId: 'showtime-1',
    showtimeSeatId: 'showtime-seat-1',
    guestSessionId: 'session-1',
  };

  // Thực hiện trách nhiệm riêng của khối beforeEach.
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Thực hiện trách nhiệm riêng của khối it.
  it('holds an available seat with one atomic Redis command', async () => {
    findUnique.mockResolvedValue({
      id: dto.showtimeSeatId,
      showtimeId: dto.showtimeId,
      status: 'AVAILABLE',
    });
    evalRedis.mockResolvedValue(1);

    const result = await service.hold(dto, { type: 'USER', userId: 'user-1' });

    expect(result.held).toBe(true);
    expect(publishSeatsChanged).toHaveBeenCalledWith(dto.showtimeId);
    expect(result.ttlSeconds).toBe(300);
    expect(evalRedis).toHaveBeenCalledTimes(1);
    expect(evalRedis.mock.calls[0][1]).toEqual([
      `seat_hold:${dto.showtimeId}:${dto.showtimeSeatId}`,
    ]);
  });

  // Thực hiện trách nhiệm riêng của khối it.
  // Chỉ phát sự kiện khi sơ đồ ghế thật sự thay đổi, tránh làm client tải lại vô ích.
  it('does not publish a seat event when the hold is rejected', async () => {
    findUnique.mockResolvedValue({
      id: dto.showtimeSeatId,
      showtimeId: dto.showtimeId,
      status: 'AVAILABLE',
    });
    evalRedis.mockResolvedValue(0);

    await expect(
      service.hold(dto, { type: 'USER', userId: 'user-1' }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(publishSeatsChanged).not.toHaveBeenCalled();
  });

  it('publishes a seat event for each showtime whose booking holds were released', async () => {
    evalRedis.mockResolvedValueOnce(2).mockResolvedValueOnce(0);

    const released = await service.releaseBookingHolds([
      { showtimeId: 'showtime-1', showtimeSeatIds: ['a', 'b'], userId: 'u' },
      { showtimeId: 'showtime-2', showtimeSeatIds: ['c'], userId: 'u' },
    ]);

    expect(released).toBe(2);
    expect(publishSeatsChanged).toHaveBeenCalledTimes(1);
    expect(publishSeatsChanged).toHaveBeenCalledWith('showtime-1');
  });

  it('rejects a seat held by another owner', async () => {
    findUnique.mockResolvedValue({
      id: dto.showtimeSeatId,
      showtimeId: dto.showtimeId,
      status: 'AVAILABLE',
    });
    evalRedis.mockResolvedValue(0);

    await expect(
      service.hold(dto, { type: 'USER', userId: 'user-1' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  // Thực hiện trách nhiệm riêng của khối it.
  it('rejects a booked database seat before Redis', async () => {
    findUnique.mockResolvedValue({
      id: dto.showtimeSeatId,
      showtimeId: dto.showtimeId,
      status: 'BOOKED',
    });

    await expect(
      service.hold(dto, { type: 'USER', userId: 'user-1' }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(evalRedis).not.toHaveBeenCalled();
  });

  // Thực hiện trách nhiệm riêng của khối it.
  it('binds all selected seats to the user atomically', async () => {
    evalRedis.mockResolvedValue(1);

    await service.bindHoldsToUser({
      showtimeId: dto.showtimeId,
      showtimeSeatIds: ['seat-1', 'seat-2'],
      actor: {
        type: 'USER',
        userId: 'user-1',
        guestSessionId: dto.guestSessionId,
      },
    });

    expect(evalRedis).toHaveBeenCalledTimes(1);
    expect(evalRedis.mock.calls[0][1]).toEqual([
      'seat_hold:showtime-1:seat-1',
      'seat_hold:showtime-1:seat-2',
    ]);
  });
});
