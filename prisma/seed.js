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
      capacity: 24,
    },
  });

  const roomTwo = await prisma.room.create({
    data: {
      cinemaId: cinema.id,
      name: 'Screen 2',
      capacity: 18,
    },
  });

  const seatsForRoomOne = [];
  for (const row of ['A', 'B', 'C']) {
    for (const number of [1, 2, 3, 4]) {
      const seat = await prisma.seat.create({
        data: {
          roomId: roomOne.id,
          row,
          number,
          type: row === 'A' && number === 2 ? 'VIP' : 'STANDARD',
        },
      });
      seatsForRoomOne.push(seat);
    }
  }

  const seatsForRoomTwo = [];
  for (const row of ['A', 'B']) {
    for (const number of [1, 2, 3]) {
      const seat = await prisma.seat.create({
        data: {
          roomId: roomTwo.id,
          row,
          number,
          type: row === 'B' && number === 2 ? 'COUPLE' : 'STANDARD',
        },
      });
      seatsForRoomTwo.push(seat);
    }
  }

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
          price: seat.type === 'VIP' ? 22.5 : seat.type === 'COUPLE' ? 24.0 : Number(showtime.basePrice),
          status: 'AVAILABLE',
        },
      });
    }
  }

  console.log('Seed completed:', {
    adminUser: adminUser.email,
    staffUser: staffUser.email,
    customerUser: customerUser.email,
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
