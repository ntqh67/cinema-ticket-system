import { BadRequestException } from '@nestjs/common';
import { BookingsService } from './bookings.service';

describe('BookingsService seat selection rules', () => {
  const findMany = jest.fn();
  const listByShowtime = jest.fn();
  const service = new BookingsService(
    { showtimeSeat: { findMany } } as any,
    { listByShowtime } as any,
  );

  const rowSeats = [1, 2, 3].map((position) => ({
    id: `ss-${position}`,
    status: 'AVAILABLE',
    seat: {
      row: 'A',
      number: position,
      position,
      type: 'STANDARD',
    },
  }));

  beforeEach(() => {
    jest.clearAllMocks();
    findMany.mockResolvedValue(rowSeats);
  });

  it('rejects an isolated standard seat between selected seats', async () => {
    listByShowtime.mockResolvedValue([
      { showtimeSeatId: 'ss-1' },
      { showtimeSeatId: 'ss-3' },
    ]);

    await expect(
      (service as any).validateNoOrphanStandardSeat('showtime-1', [
        rowSeats[0],
        rowSeats[2],
      ]),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('allows the outermost standard seat to remain available', async () => {
    listByShowtime.mockResolvedValue([
      { showtimeSeatId: 'ss-2' },
      { showtimeSeatId: 'ss-3' },
    ]);

    await expect(
      (service as any).validateNoOrphanStandardSeat('showtime-1', [
        rowSeats[1],
        rowSeats[2],
      ]),
    ).resolves.toBeUndefined();
  });

  it('does not apply the standard-seat gap rule to Sweetbox', async () => {
    await expect(
      (service as any).validateNoOrphanStandardSeat('showtime-1', [
        { ...rowSeats[0], seat: { ...rowSeats[0].seat, type: 'COUPLE' } },
      ]),
    ).resolves.toBeUndefined();
    expect(findMany).not.toHaveBeenCalled();
  });
});
