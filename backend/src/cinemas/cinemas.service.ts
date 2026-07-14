/**
 * Mục đích: Cung cấp dữ liệu rạp công khai cho luồng duyệt phim của khách hàng.
 */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
// Lớp CinemasService đọc catalog rạp Đà Nẵng mà không mở các thao tác quản trị.
export class CinemasService {
  constructor(private readonly prisma: PrismaService) {}

  // Trả đủ rạp và phòng công khai để frontend không phụ thuộc API admin.
  async findAll() {
    const cinemas = await this.prisma.cinema.findMany({
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
        chain: {
          select: { id: true, name: true },
        },
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

    return { cinemas };
  }
}
