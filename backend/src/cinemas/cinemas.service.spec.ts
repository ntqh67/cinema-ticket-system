/**
 * Mục đích: Kiểm thử catalog rạp công khai chỉ đọc dữ liệu Đà Nẵng theo đúng thứ tự.
 */
import { CinemasService } from './cinemas.service';

describe('CinemasService', () => {
  // API khách phải đọc đủ ảnh và phòng từ PostgreSQL, không dùng dữ liệu admin giả lập.
  it('returns the public Da Nang cinema catalog', async () => {
    const cinemas = [
      {
        id: 'cinema-1',
        code: 'CR01',
        name: 'CR Cinema Riverside',
        imageUrl: '/assets/images/cinemas/cr01-riverside.jpg',
        rooms: [],
      },
    ];
    const findMany = jest.fn().mockResolvedValue(cinemas);
    const service = new CinemasService({ cinema: { findMany } } as any);

    await expect(service.findAll()).resolves.toEqual({ cinemas });
    expect(findMany).toHaveBeenCalledWith({
      where: { city: 'Đà Nẵng' },
      select: {
        id: true,
        chainId: true,
        code: true,
        name: true,
        address: true,
        ward: true,
        city: true,
        phone: true,
        imageUrl: true,
        chain: { select: { id: true, name: true } },
        rooms: {
          select: {
            id: true,
            cinemaId: true,
            name: true,
            capacity: true,
          },
          orderBy: { name: 'asc' },
        },
      },
      orderBy: [{ code: 'asc' }, { name: 'asc' }],
    });
  });
});
