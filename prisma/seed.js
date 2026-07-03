const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  await prisma.ticketCheckIn.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.bookingItem.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.showtimeSeat.deleteMany();
  await prisma.showtime.deleteMany();
  await prisma.seat.deleteMany();
  await prisma.room.deleteMany();
  await prisma.cinema.deleteMany();
  await prisma.movieGenre.deleteMany();
  await prisma.genre.deleteMany();
  await prisma.movie.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();

  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@cinema.test',
      passwordHash: bcrypt.hashSync('DevAdmin123!', 10),
      firstName: 'Admin',
      lastName: 'User',
      role: 'ADMIN',
    },
  });

  const staffUser = await prisma.user.create({
    data: {
      email: 'staff@cinema.test',
      passwordHash: bcrypt.hashSync('DevStaff123!', 10),
      firstName: 'Staff',
      lastName: 'User',
      role: 'STAFF',
    },
  });

  const customerUser = await prisma.user.create({
    data: {
      id: 'cmr4ezer0000256u181u0ijfy',
      email: 'customer@cinema.test',
      passwordHash: bcrypt.hashSync('DevCustomer123!', 10),
      firstName: 'Customer',
      lastName: 'User',
      role: 'CUSTOMER',
    },
  });

  const actionGenre = await prisma.genre.create({ data: { name: 'Action' } });
  const dramaGenre = await prisma.genre.create({ data: { name: 'Drama' } });

  const movieOne = await prisma.movie.create({
    data: {
      title: 'Midnight Circuit',
      description: 'A high-speed thriller set in a city of neon lights.',
      durationMin: 132,
      releaseDate: new Date('2026-07-10T00:00:00.000Z'),
      status: 'NOW_SHOWING',
      genres: {
        create: [{ genre: { connect: { id: actionGenre.id } } }],
      },
    },
  });

  const movieTwo = await prisma.movie.create({
    data: {
      title: 'Starlight Harbor',
      description: 'A heartfelt drama about rebuilding a coastal town.',
      durationMin: 118,
      releaseDate: new Date('2026-08-15T00:00:00.000Z'),
      status: 'COMING_SOON',
      genres: {
        create: [{ genre: { connect: { id: dramaGenre.id } } }],
      },
    },
  });

  const cinema = await prisma.cinema.create({
    data: {
      name: 'Aurora Cineplex',
      address: '123 Market Street',
      city: 'Seattle',
      phone: '+1-206-555-0100',
      email: 'info@aurora.test',
    },
  });

  const roomOne = await prisma.room.create({
    data: {
      cinemaId: cinema.id,
      name: 'Screen 1',
      capacity: 133,
    },
  });

  const hungUser = await prisma.user.create({
    data: {
      email: 'hung@example.com',
      passwordHash: bcrypt.hashSync('user123', 10),
      firstName: 'Nguyen Van',
      lastName: 'Hung',
      role: 'CUSTOMER',
    },
  });

  const roomTwo = await prisma.room.create({
    data: {
      cinemaId: cinema.id,
      name: 'Screen 2',
      capacity: 90,
    },
  });

  async function createSeatLayout({ roomId, rows, columns, vipRows, coupleRows }) {
    const seats = [];

    for (const row of rows) {
      const isCoupleRow = coupleRows.includes(row);
      const seatCount = isCoupleRow ? Math.floor(columns / 2) : columns;

      for (let number = 1; number <= seatCount; number += 1) {
        const type = isCoupleRow
          ? 'COUPLE'
          : vipRows.includes(row)
            ? 'VIP'
            : 'STANDARD';
        const seat = await prisma.seat.create({
          data: {
            roomId,
            row,
            number,
            type,
          },
        });
        seats.push(seat);
      }
    }

    return seats;
  }

  const seatsForRoomOne = await createSeatLayout({
    roomId: roomOne.id,
    rows: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'],
    columns: 14,
    vipRows: ['D', 'E', 'F', 'G', 'H'],
    coupleRows: ['J'],
  });

  const seatsForRoomTwo = await createSeatLayout({
    roomId: roomTwo.id,
    rows: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'],
    columns: 12,
    vipRows: ['D', 'E', 'F', 'G'],
    coupleRows: ['H'],
  });

  const showtimes = [];
  showtimes.push(
    await prisma.showtime.create({
      data: {
        movieId: movieOne.id,
        roomId: roomOne.id,
        startAt: new Date('2026-06-29T19:00:00.000Z'),
        endAt: new Date('2026-06-29T21:12:00.000Z'),
        basePrice: 15.0,
      },
    }),
  );
  showtimes.push(
    await prisma.showtime.create({
      data: {
        movieId: movieOne.id,
        roomId: roomTwo.id,
        startAt: new Date('2026-06-30T18:30:00.000Z'),
        endAt: new Date('2026-06-30T20:28:00.000Z'),
        basePrice: 14.5,
      },
    }),
  );
  showtimes.push(
    await prisma.showtime.create({
      data: {
        movieId: movieTwo.id,
        roomId: roomOne.id,
        startAt: new Date('2026-07-02T20:00:00.000Z'),
        endAt: new Date('2026-07-02T21:58:00.000Z'),
        basePrice: 16.0,
      },
    }),
  );

  for (const showtime of showtimes) {
    const seats = showtime.roomId === roomOne.id ? seatsForRoomOne : seatsForRoomTwo;
    for (const seat of seats) {
      await prisma.showtimeSeat.create({
        data: {
          showtimeId: showtime.id,
          seatId: seat.id,
          price:
            seat.type === 'VIP'
              ? Number(showtime.basePrice) * 1.3
              : seat.type === 'COUPLE'
                ? Number(showtime.basePrice) * 1.6
                : Number(showtime.basePrice),
          status: 'AVAILABLE',
        },
      });
    }
  }

  console.log('Seed completed:', {
    adminUser: adminUser.email,
    staffUser: staffUser.email,
    customerUser: customerUser.email,
    hungUser: hungUser.email,
    movieCount: 2,
    cinemaId: cinema.id,
    showtimeCount: showtimes.length,
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
