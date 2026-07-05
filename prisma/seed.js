const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

dotenv.config();

const prisma = new PrismaClient();
const CLEANUP_MINUTES = 30;
const PRICE_BY_SEAT_TYPE = {
  STANDARD: 8,
  VIP: 12,
  COUPLE: 18,
};

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
      capacity: 102,
    },
  });

  const roomThree = await prisma.room.create({
    data: {
      cinemaId: cinema.id,
      name: 'Screen 3',
      capacity: 85,
    },
  });

  const roomFour = await prisma.room.create({
    data: {
      cinemaId: cinema.id,
      name: 'Screen 4',
      capacity: 90,
    },
  });

  function getVipZone(rows, columns) {
    const zoneRowCount = Math.min(3, rows.length);
    const zoneColCount = Math.min(5, columns);
    const rowStart = Math.max(0, Math.round((rows.length - zoneRowCount) / 2));
    const colStart = Math.max(1, Math.round((columns - zoneColCount) / 2) + 1);

    return {
      rows: new Set(rows.slice(rowStart, rowStart + zoneRowCount)),
      colStart,
      colEnd: colStart + zoneColCount - 1,
    };
  }

  async function createSeatLayout({ roomId, rows, columns, coupleRows }) {
    const seats = [];
    const resolvedVipZone = getVipZone(rows, columns);

    for (const row of rows) {
      const isCoupleRow = coupleRows.includes(row);
      const seatCount = isCoupleRow ? Math.floor(columns / 2) : columns;

      for (let number = 1; number <= seatCount; number += 1) {
        const isVipSeat =
          !isCoupleRow &&
          resolvedVipZone.rows.has(row) &&
          number >= resolvedVipZone.colStart &&
          number <= resolvedVipZone.colEnd;
        const type = isCoupleRow
          ? 'COUPLE'
          : isVipSeat
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
    coupleRows: ['J'],
  });

  const seatsForRoomTwo = await createSeatLayout({
    roomId: roomTwo.id,
    rows: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'],
    columns: 12,
    coupleRows: ['I'],
  });

  const seatsForRoomThree = await createSeatLayout({
    roomId: roomThree.id,
    rows: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'],
    columns: 10,
    coupleRows: ['I'],
  });

  const seatsForRoomFour = await createSeatLayout({
    roomId: roomFour.id,
    rows: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'],
    columns: 12,
    coupleRows: ['H'],
  });

  function addMinutes(date, minutes) {
    return new Date(date.getTime() + minutes * 60 * 1000);
  }

  async function createShowtime({ movieId, roomId, startAt, endAt }) {
    const start = new Date(startAt);
    const end = new Date(endAt);
    const conflict = await prisma.showtime.findFirst({
      where: {
        roomId,
        startAt: { lt: addMinutes(end, CLEANUP_MINUTES) },
        endAt: { gt: addMinutes(start, -CLEANUP_MINUTES) },
      },
    });

    if (conflict) {
      throw new Error(
        `Showtime conflict in room ${roomId}: ${start.toISOString()} - ${end.toISOString()}`,
      );
    }

    return prisma.showtime.create({
      data: {
        movieId,
        roomId,
        startAt: start,
        endAt: end,
        basePrice: PRICE_BY_SEAT_TYPE.STANDARD,
      },
    });
  }

  function showtimeAt(date, startTime, endTime) {
    return {
      startAt: `${date}T${startTime}:00.000+07:00`,
      endAt: `${date}T${endTime}:00.000+07:00`,
    };
  }

  const roomSchedules = [
    {
      roomId: roomOne.id,
      slots: [
        ['09:00', '11:12'],
        ['11:45', '13:57'],
        ['14:30', '16:42'],
        ['19:00', '21:12'],
      ],
    },
    {
      roomId: roomTwo.id,
      slots: [
        ['09:30', '11:28'],
        ['12:00', '13:58'],
        ['14:30', '16:28'],
        ['19:30', '21:28'],
      ],
    },
    {
      roomId: roomThree.id,
      slots: [
        ['10:00', '11:58'],
        ['12:30', '14:28'],
        ['15:00', '16:58'],
        ['20:00', '21:58'],
      ],
    },
    {
      roomId: roomFour.id,
      slots: [
        ['10:30', '12:28'],
        ['13:00', '14:58'],
        ['15:30', '17:28'],
        ['20:30', '22:28'],
      ],
    },
  ];

  const showtimeConfigs = [];
  const seedStartDate = new Date('2026-06-30T00:00:00.000+07:00');
  for (let dayOffset = 0; dayOffset < 7; dayOffset += 1) {
    const date = new Date(seedStartDate);
    date.setDate(seedStartDate.getDate() + dayOffset);
    const dateText = date.toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });

    roomSchedules.forEach((schedule, roomIndex) => {
      schedule.slots.forEach(([startTime, endTime], slotIndex) => {
        const movieId =
          (dayOffset + roomIndex + slotIndex) % 2 === 0
            ? movieOne.id
            : movieTwo.id;
        showtimeConfigs.push({
          movieId,
          roomId: schedule.roomId,
          ...showtimeAt(dateText, startTime, endTime),
        });
      });
    });
  }

  const showtimes = [];
  for (const config of showtimeConfigs) {
    showtimes.push(await createShowtime(config));
  }

  for (const showtime of showtimes) {
    const seatsByRoomId = {
      [roomOne.id]: seatsForRoomOne,
      [roomTwo.id]: seatsForRoomTwo,
      [roomThree.id]: seatsForRoomThree,
      [roomFour.id]: seatsForRoomFour,
    };
    const seats = seatsByRoomId[showtime.roomId] || [];
    for (const seat of seats) {
      await prisma.showtimeSeat.create({
        data: {
          showtimeId: showtime.id,
          seatId: seat.id,
          price: PRICE_BY_SEAT_TYPE[seat.type],
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
