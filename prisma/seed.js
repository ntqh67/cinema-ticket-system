const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

dotenv.config();

const prisma = new PrismaClient();

const CLEANUP_MINUTES = 30;
const SEED_DAY_COUNT = 7;
const PRICE_BY_SEAT_TYPE = {
  STANDARD: 80000,
  VIP: 120000,
  COUPLE: 180000,
};

const CINEMAS = [
  {
    chain: 'Galaxy',
    name: 'Galaxy Da Nang',
    address: 'Tang 3 Co.opmart, 478 Dien Bien Phu',
    roomCount: 7,
  },
  {
    chain: 'CGV',
    name: 'CGV Vinh Trung Plaza',
    address: '255-257 Hung Vuong, Thanh Khe',
    roomCount: 6,
  },
  {
    chain: 'Rio',
    name: 'Rio Da Nang',
    address: '403 Ton Duc Thang, Hoa Khanh',
    roomCount: 6,
  },
  {
    chain: 'CGV',
    name: 'CGV Vincom Da Nang',
    address: 'Tang 4 Vincom, Ngo Quyen, Son Tra',
    roomCount: 5,
  },
  {
    chain: 'Metiz',
    name: 'Metiz Cinema',
    address: 'Tang 1 Helio Center, duong 2/9',
    roomCount: 5,
  },
  {
    chain: 'Lotte',
    name: 'Lotte Cinema Da Nang',
    address: 'Tang 5-6 Lotte Mart Da Nang',
    roomCount: 4,
  },
  {
    chain: 'Le Do',
    name: 'Rap Le Do',
    address: '46 Tran Phu, Hai Chau',
    roomCount: 2,
  },
  {
    chain: 'Starlight',
    name: 'Starlight Da Nang',
    address: 'Tang 4 Nguyen Kim, 46 Dien Bien Phu',
    roomCount: 5,
  },
  {
    chain: 'CGV',
    name: 'CGV MM Supercenter Da Nang',
    address: 'MM Mega Market, 167 Nguyen Sinh Sac',
    roomCount: 5,
  },
];

const ROOM_LAYOUTS = [
  { rows: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'], columns: 10, label: 'Small' },
  { rows: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'], columns: 12, label: 'Standard' },
  { rows: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'], columns: 14, label: 'Large' },
];

const GENRES = [
  'Action',
  'Adventure',
  'Animation',
  'Comedy',
  'Drama',
  'Family',
  'Fantasy',
  'Horror',
  'Sci-Fi',
  'Thriller',
];

const NOW_SHOWING_MOVIES = [
  {
    title: 'Superman',
    description: 'A new generation of Superman begins with action, heart, and hope.',
    durationMin: 129,
    releaseDate: '2026-07-10',
    genres: ['Action', 'Adventure', 'Fantasy'],
    posterSeed: 'superman-2026',
  },
  {
    title: 'F1: The Movie',
    description: 'A high-speed racing drama following a veteran driver and a rising rookie.',
    durationMin: 155,
    releaseDate: '2026-06-27',
    genres: ['Action', 'Drama'],
    posterSeed: 'f1-the-movie',
  },
  {
    title: 'Jurassic World: Rebirth',
    description: 'A new expedition enters a dangerous world of dinosaurs and genetic secrets.',
    durationMin: 134,
    releaseDate: '2026-07-02',
    genres: ['Action', 'Adventure', 'Sci-Fi'],
    posterSeed: 'jurassic-world-rebirth',
  },
  {
    title: 'How to Train Your Dragon',
    description: 'A live-action adventure about friendship, courage, and dragons.',
    durationMin: 125,
    releaseDate: '2026-06-13',
    genres: ['Adventure', 'Family', 'Fantasy'],
    posterSeed: 'how-to-train-your-dragon',
  },
  {
    title: 'Doraemon: Nobita va The Gioi Trong Tranh',
    description: 'Nobita and friends begin a colorful adventure inside a mysterious painting world.',
    durationMin: 105,
    releaseDate: '2026-05-23',
    genres: ['Animation', 'Family', 'Adventure'],
    posterSeed: 'doraemon-art-world',
  },
  {
    title: 'Detective Conan: Du Anh Cua Doc Nhan',
    description: 'Conan investigates a dangerous case connected to a long-hidden memory.',
    durationMin: 110,
    releaseDate: '2026-06-20',
    genres: ['Animation', 'Thriller'],
    posterSeed: 'detective-conan-one-eyed',
  },
  {
    title: 'Mang Me Di Bo',
    description: 'A Vietnamese family drama about love, regret, and the road back home.',
    durationMin: 112,
    releaseDate: '2026-07-01',
    genres: ['Drama', 'Family'],
    posterSeed: 'mang-me-di-bo',
  },
  {
    title: '28 Years Later',
    description: 'A tense horror story set decades after a terrifying outbreak.',
    durationMin: 115,
    releaseDate: '2026-06-20',
    genres: ['Horror', 'Thriller'],
    posterSeed: '28-years-later',
  },
];

const BASE_SCHEDULES = [
  ['08:30', '11:15', '14:00', '16:45', '19:30', '22:15'],
  ['09:00', '11:45', '14:30', '17:15', '20:00', '22:45'],
  ['09:30', '12:15', '15:00', '17:45', '20:30'],
  ['10:00', '12:45', '15:30', '18:15', '21:00'],
  ['10:30', '13:15', '16:00', '18:45', '21:30'],
];

async function main() {
  await clearDatabase();

  const adminUser = await createUser({
    email: 'admin@cinema.test',
    password: 'DevAdmin123!',
    firstName: 'Admin',
    lastName: 'User',
    role: 'ADMIN',
  });
  const staffUser = await createUser({
    email: 'staff@cinema.test',
    password: 'DevStaff123!',
    firstName: 'Staff',
    lastName: 'User',
    role: 'STAFF',
  });
  const customerUser = await createUser({
    id: 'cmr4ezer0000256u181u0ijfy',
    email: 'customer@cinema.test',
    password: 'DevCustomer123!',
    firstName: 'Customer',
    lastName: 'User',
    role: 'CUSTOMER',
  });
  const hungUser = await createUser({
    email: 'hung@example.com',
    password: 'user123',
    firstName: 'Nguyen Van',
    lastName: 'Hung',
    role: 'CUSTOMER',
  });

  const genres = await createGenres();
  const movies = await createMovies(genres);
  const chains = await createCinemaChains();
  const roomSeatMap = await createCinemasRoomsAndSeats(chains);
  const showtimes = await createShowtimes(movies, roomSeatMap);
  await createShowtimeSeats(showtimes, roomSeatMap);

  console.log('Seed completed:', {
    adminUser: adminUser.email,
    staffUser: staffUser.email,
    customerUser: customerUser.email,
    hungUser: hungUser.email,
    movieCount: movies.length,
    cinemaChainCount: chains.size,
    cinemaCount: CINEMAS.length,
    roomCount: roomSeatMap.length,
    showtimeCount: showtimes.length,
    currency: 'VND',
  });
}

async function clearDatabase() {
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
  await prisma.cinemaChain.deleteMany();
  await prisma.movieGenre.deleteMany();
  await prisma.genre.deleteMany();
  await prisma.movie.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();
}

function createUser({ id, email, password, firstName, lastName, role }) {
  return prisma.user.create({
    data: {
      id,
      email,
      passwordHash: bcrypt.hashSync(password, 10),
      firstName,
      lastName,
      role,
    },
  });
}

async function createGenres() {
  const genreEntries = await Promise.all(
    GENRES.map((name) => prisma.genre.create({ data: { name } })),
  );
  return new Map(genreEntries.map((genre) => [genre.name, genre]));
}

async function createMovies(genres) {
  const movies = [];

  for (const movieConfig of NOW_SHOWING_MOVIES) {
    const movie = await prisma.movie.create({
      data: {
        title: movieConfig.title,
        description: movieConfig.description,
        durationMin: movieConfig.durationMin,
        releaseDate: new Date(`${movieConfig.releaseDate}T00:00:00.000+07:00`),
        posterUrl: `https://picsum.photos/seed/${movieConfig.posterSeed}/400/600`,
        trailerUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
        status: 'NOW_SHOWING',
        genres: {
          create: movieConfig.genres.map((genreName) => ({
            genre: { connect: { id: genres.get(genreName).id } },
          })),
        },
      },
    });
    movies.push(movie);
  }

  return movies;
}

async function createCinemaChains() {
  const chainNames = [...new Set(CINEMAS.map((cinema) => cinema.chain))];
  const chains = new Map();

  for (const name of chainNames) {
    const chain = await prisma.cinemaChain.create({
      data: {
        name,
        city: 'Da Nang',
      },
    });
    chains.set(name, chain);
  }

  return chains;
}

async function createCinemasRoomsAndSeats(chains) {
  const roomSeatMap = [];

  for (const cinemaConfig of CINEMAS) {
    const cinema = await prisma.cinema.create({
      data: {
        chainId: chains.get(cinemaConfig.chain).id,
        name: cinemaConfig.name,
        address: cinemaConfig.address,
        city: 'Da Nang',
        phone: '+84-236-000-0000',
        email: `${slugify(cinemaConfig.name)}@cinema.test`,
      },
    });

    for (let roomIndex = 0; roomIndex < cinemaConfig.roomCount; roomIndex += 1) {
      const layout = ROOM_LAYOUTS[(roomIndex + cinemaConfig.roomCount) % ROOM_LAYOUTS.length];
      const seatCount = countSeats(layout);
      const room = await prisma.room.create({
        data: {
          cinemaId: cinema.id,
          name: `Screen ${roomIndex + 1} - ${layout.label}`,
          capacity: seatCount,
        },
      });
      const seats = await createSeatLayout({
        roomId: room.id,
        rows: layout.rows,
        columns: layout.columns,
        coupleRows: [layout.rows[layout.rows.length - 1]],
      });
      roomSeatMap.push({ cinema, room, seats, layout });
    }
  }

  return roomSeatMap;
}

function countSeats(layout) {
  const regularRows = layout.rows.length - 1;
  return regularRows * layout.columns + Math.floor(layout.columns / 2);
}

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
  const vipZone = getVipZone(rows, columns);

  for (const row of rows) {
    const isCoupleRow = coupleRows.includes(row);
    const seatCount = isCoupleRow ? Math.floor(columns / 2) : columns;

    for (let number = 1; number <= seatCount; number += 1) {
      const isVipSeat =
        !isCoupleRow &&
        vipZone.rows.has(row) &&
        number >= vipZone.colStart &&
        number <= vipZone.colEnd;
      const seat = await prisma.seat.create({
        data: {
          roomId,
          row,
          number,
          type: isCoupleRow ? 'COUPLE' : isVipSeat ? 'VIP' : 'STANDARD',
        },
      });
      seats.push(seat);
    }
  }

  return seats;
}

async function createShowtimes(movies, roomSeatMap) {
  const showtimes = [];
  const seedStartDate = startOfTodayInBangkok();

  for (let dayOffset = 0; dayOffset < SEED_DAY_COUNT; dayOffset += 1) {
    const date = new Date(seedStartDate);
    date.setDate(seedStartDate.getDate() + dayOffset);
    const dateText = formatSeedDate(date);

    for (let roomIndex = 0; roomIndex < roomSeatMap.length; roomIndex += 1) {
      const roomInfo = roomSeatMap[roomIndex];
      const starts = BASE_SCHEDULES[(roomIndex + dayOffset) % BASE_SCHEDULES.length];
      const slotLimit = Math.min(starts.length, 4 + ((roomIndex + dayOffset) % 3));

      for (let slotIndex = 0; slotIndex < slotLimit; slotIndex += 1) {
        const movie = movies[(dayOffset + roomIndex + slotIndex) % movies.length];
        const startAt = dateTimeAt(dateText, starts[slotIndex]);
        const endAt = addMinutes(startAt, movie.durationMin);
        const candidate = {
          movieId: movie.id,
          roomId: roomInfo.room.id,
          startAt,
          endAt,
        };

        if (await canCreateShowtime(candidate)) {
          showtimes.push(await createShowtime(candidate));
        }
      }
    }
  }

  return showtimes;
}

async function canCreateShowtime({ roomId, startAt, endAt }) {
  const conflict = await prisma.showtime.findFirst({
    where: {
      roomId,
      startAt: { lt: addMinutes(endAt, CLEANUP_MINUTES) },
      endAt: { gt: addMinutes(startAt, -CLEANUP_MINUTES) },
    },
  });
  return !conflict;
}

function createShowtime({ movieId, roomId, startAt, endAt }) {
  return prisma.showtime.create({
    data: {
      movieId,
      roomId,
      startAt,
      endAt,
      basePrice: PRICE_BY_SEAT_TYPE.STANDARD,
    },
  });
}

async function createShowtimeSeats(showtimes, roomSeatMap) {
  const seatsByRoomId = new Map(
    roomSeatMap.map((roomInfo) => [roomInfo.room.id, roomInfo.seats]),
  );

  for (const showtime of showtimes) {
    const seats = seatsByRoomId.get(showtime.roomId) || [];
    await prisma.showtimeSeat.createMany({
      data: seats.map((seat) => ({
        showtimeId: showtime.id,
        seatId: seat.id,
        price: PRICE_BY_SEAT_TYPE[seat.type],
        status: 'AVAILABLE',
      })),
    });
  }
}

function startOfTodayInBangkok() {
  const now = new Date();
  const bangkokDate = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
  return new Date(`${bangkokDate}T00:00:00.000+07:00`);
}

function formatSeedDate(date) {
  return date.toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });
}

function dateTimeAt(dateText, timeText) {
  return new Date(`${dateText}T${timeText}:00.000+07:00`);
}

function addMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function slugify(value) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
