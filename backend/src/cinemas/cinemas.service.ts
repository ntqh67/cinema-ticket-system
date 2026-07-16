/**
 * Mục đích: Cung cấp dữ liệu rạp công khai cho luồng duyệt phim của khách hàng.
 */
import { Injectable, NotFoundException } from '@nestjs/common';
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

  // Trả chi tiết một chi nhánh rạp kèm phòng và sơ đồ ghế để khách xem trước khi chọn phim.
  async findOne(id: string) {
    const cinema = await this.prisma.cinema.findUnique({
      where: { id },
      include: {
        chain: { select: { id: true, name: true } },
        rooms: {
          include: {
            seats: {
              orderBy: [{ row: 'asc' }, { position: 'asc' }],
            },
          },
          orderBy: { name: 'asc' },
        },
      },
    });

    if (!cinema) throw new NotFoundException('Cinema not found');

    const rooms = cinema.rooms.map((room) => {
      const rowLabels = [...new Set(room.seats.map((seat) => seat.row))].sort();
      const cols = room.seats.reduce(
        (max, seat) => Math.max(max, seat.position || seat.number || 0),
        0,
      );
      const seatTypeSummary = room.seats.reduce<Record<string, number>>((summary, seat) => {
        summary[seat.type] = (summary[seat.type] || 0) + 1;
        return summary;
      }, {});

      return {
        id: room.id,
        cinemaId: room.cinemaId,
        name: room.name,
        capacity: room.capacity,
        rows: rowLabels.length,
        cols,
        seatCount: room.seats.length,
        seatTypeSummary,
      };
    });

    const seats = cinema.rooms.flatMap((room) =>
      room.seats.map((seat) => ({
        id: seat.id,
        roomId: seat.roomId,
        row: seat.row,
        number: seat.number,
        position: seat.position,
        type: seat.type,
      })),
    );

    return {
      cinema: {
        id: cinema.id,
        chainId: cinema.chainId,
        chain: cinema.chain,
        code: cinema.code,
        name: cinema.name,
        address: cinema.address,
        ward: cinema.ward,
        city: cinema.city,
        phone: cinema.phone,
        email: cinema.email,
        imageUrl: cinema.imageUrl,
      },
      rooms,
      seats,
      overview: {
        rooms: rooms.length,
        seats: seats.length,
      },
    };
  }
}
