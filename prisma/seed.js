const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const { normalizeGenreName } = require('../scripts/genre-map');

dotenv.config();

const prisma = new PrismaClient();

const CLEANUP_MINUTES = 30;
const SEED_DAY_COUNT = 7;
const PRICE_BY_SEAT_TYPE = {
  STANDARD: 80000,
  COUPLE: 180000,
};

const CINEMA_PRICE_BY_CHAIN = {
  'CR Cinema': { STANDARD: 85000, COUPLE: 200000 },
};

const CONCESSION_COMBOS = [
  {
    name: 'Combo Solo',
    description: '1 bap vua + 1 nuoc ngot',
    price: 79000,
    imageUrl: 'https://images.unsplash.com/photo-1578849278619-e73505e9610f?auto=format&fit=crop&w=600&q=80',
  },
  {
    name: 'Combo Couple',
    description: '1 bap lon + 2 nuoc ngot',
    price: 129000,
    imageUrl: 'https://images.unsplash.com/photo-1585647347384-2593bc35786b?auto=format&fit=crop&w=600&q=80',
  },
  {
    name: 'Combo Family',
    description: '2 bap lon + 4 nuoc ngot',
    price: 229000,
    imageUrl: 'https://images.unsplash.com/photo-1526676037777-05a232554f77?auto=format&fit=crop&w=600&q=80',
  },
  {
    name: 'Nuoc Ngot',
    description: '1 ly nuoc ngot tuy chon',
    price: 35000,
    imageUrl: 'https://images.unsplash.com/photo-1581006852262-e4307cf6283a?auto=format&fit=crop&w=600&q=80',
  },
];

const CINEMAS = [
  {
    chain: 'CR Cinema',
    code: 'CR01',
    name: 'CR Cinema Riverside',
    address: '128 Bạch Đằng',
    ward: 'Hải Châu',
    roomCount: 7,
    imageUrl: '/assets/images/cinemas/cr01-riverside.jpg',
  },
  {
    chain: 'CR Cinema',
    code: 'CR02',
    name: 'CR Cinema Central Park',
    address: '215 Điện Biên Phủ',
    ward: 'Thanh Khê',
    roomCount: 7,
    imageUrl: '/assets/images/cinemas/cr02-central-park.jpg',
  },
  {
    chain: 'CR Cinema',
    code: 'CR03',
    name: 'CR Cinema Ocean View',
    address: '96 Võ Nguyên Giáp',
    ward: 'Sơn Trà',
    roomCount: 5,
    imageUrl: '/assets/images/cinemas/cr03-ocean-view.jpg',
  },
  {
    chain: 'CR Cinema',
    code: 'CR04',
    name: 'CR Cinema Marble Mountain',
    address: '168 Ngũ Hành Sơn',
    ward: 'Ngũ Hành Sơn',
    roomCount: 5,
    imageUrl: '/assets/images/cinemas/cr04-marble-mountain.jpg',
  },
  {
    chain: 'CR Cinema',
    code: 'CR05',
    name: 'CR Cinema Northwest',
    address: '305 Nguyễn Lương Bằng',
    ward: 'Liên Chiểu',
    roomCount: 5,
    imageUrl: '/assets/images/cinemas/cr05-northwest.jpg',
  },
  {
    chain: 'CR Cinema',
    code: 'CR06',
    name: 'CR Cinema Green Square',
    address: '142 Cách Mạng Tháng Tám',
    ward: 'Cẩm Lệ',
    roomCount: 3,
    imageUrl: '/assets/images/cinemas/cr06-green-square.jpg',
  },
  {
    chain: 'CR Cinema',
    code: 'CR07',
    name: 'CR Cinema Golden Hills',
    address: '75 Quốc lộ 14B',
    ward: 'Hòa Vang',
    roomCount: 3,
    imageUrl: '/assets/images/cinemas/cr07-golden-hills.jpg',
  },
];

const ROOM_LAYOUTS = [
  {
    label: 'Layout 1 - Split Sweetbox',
    seatRows: [
      ...makeRows('ABCDEFGH', makePositions(14, 1, 6)),
      ...makeRows('IJ', makePositions(16, 1, 6)),
      makeCoupleRow('K', [1, 3, 5, 8, 10, 12, 14]),
    ],
  },
  {
    label: 'Layout 2 - Standard',
    seatRows: makeRows('ABCDEFGHI', makePositions(16)),
  },
  {
    label: 'Layout 3 - Compact Sweetbox',
    seatRows: [
      ...makeRows('ABCDEFG', makePositions(10, 3)),
      { row: 'H', positions: makePositions(12) },
      makeCoupleRow('I', [1, 4, 7, 10, 13]),
    ],
  },
  {
    label: 'Layout 4 - Large Sweetbox',
    seatRows: [
      ...makeRows('ABCDEFGHIJKL', makePositions(16, 1, 10)),
      makeCoupleRow('M', [1, 3, 5, 7, 11, 13, 15, 17]),
    ],
  },
  {
    label: 'Layout 5 - Premium Sweetbox',
    seatRows: [
      ...makeRows('ABCDEFGHI', makePositions(10, 3)),
      { row: 'J', positions: makePositions(12) },
      makeCoupleRow('K', [1, 3, 5, 7, 9, 11]),
    ],
  },
];

function makePositions(count, start = 1, aisleAfter = 0) {
  return Array.from({ length: count }, (_, index) => {
    const position = start + index;
    return aisleAfter && position > aisleAfter ? position + 1 : position;
  });
}

function makeRows(labels, positions) {
  return [...labels].map((row) => ({ row, positions }));
}

function makeCoupleRow(row, positions) {
  return { row, positions, type: 'COUPLE' };
}

const GENRES = [
  'Hành Động',
  'Phiêu Lưu',
  'Hoạt Hình',
  'Hài',
  'Chính Kịch',
  'Gia Đình',
  'Giả Tưởng',
  'Kinh Dị',
  'Khoa Học Viễn Tưởng',
  'Giật Gân',
];

const NOW_SHOWING_MOVIES = [
  {
    tmdbId: null,
    title: 'Superman',
    description: 'A new generation of Superman begins with action, heart, and hope.',
    durationMin: 129,
    releaseDate: '2026-07-10',
    ageRating: 'C13',
    genres: ['Hành Động', 'Phiêu Lưu', 'Giả Tưởng'],
    posterUrl: 'https://upload.wikimedia.org/wikipedia/en/thumb/3/32/Superman_%282025_film%29_poster.jpg/250px-Superman_%282025_film%29_poster.jpg',
    trailerUrl: 'https://www.youtube.com/embed/MikgqM0LXr4',
  },
  {
    tmdbId: null,
    title: 'F1: The Movie',
    description: 'A high-speed racing drama following a veteran driver and a rising rookie.',
    durationMin: 155,
    releaseDate: '2026-06-27',
    ageRating: 'C13',
    genres: ['Hành Động', 'Chính Kịch'],
    posterUrl: 'https://upload.wikimedia.org/wikipedia/en/thumb/3/38/F1_%282025_film%29.png/250px-F1_%282025_film%29.png',
    trailerUrl: 'https://www.youtube.com/embed/RXQtH7kLRWw',
  },
  {
    tmdbId: null,
    title: 'Jurassic World: Rebirth',
    description: 'A new expedition enters a dangerous world of dinosaurs and genetic secrets.',
    durationMin: 134,
    releaseDate: '2026-07-02',
    ageRating: 'C13',
    genres: ['Hành Động', 'Phiêu Lưu', 'Khoa Học Viễn Tưởng'],
    posterUrl: 'https://upload.wikimedia.org/wikipedia/en/thumb/a/a5/Jurassic_World_Rebirth_poster.jpg/250px-Jurassic_World_Rebirth_poster.jpg',
    trailerUrl: 'https://www.youtube.com/embed/2ZhB-YO5Tnk',
  },
  {
    tmdbId: null,
    title: 'How to Train Your Dragon',
    description: 'A live-action adventure about friendship, courage, and dragons.',
    durationMin: 125,
    releaseDate: '2026-06-13',
    ageRating: 'P',
    genres: ['Phiêu Lưu', 'Gia Đình', 'Giả Tưởng'],
    posterUrl: 'https://upload.wikimedia.org/wikipedia/en/8/80/How_To_Train_Your_Dragon_2025_Poster.jpg',
    trailerUrl: 'https://www.youtube.com/embed/agfeEa8nEIo',
  },
  {
    tmdbId: null,
    title: 'Doraemon: Nobita va The Gioi Trong Tranh',
    description: 'Nobita and friends begin a colorful adventure inside a mysterious painting world.',
    durationMin: 105,
    releaseDate: '2026-05-23',
    ageRating: 'P',
    genres: ['Hoạt Hình', 'Gia Đình', 'Phiêu Lưu'],
    posterUrl: 'https://upload.wikimedia.org/wikipedia/en/thumb/4/44/Doraemon_Nobita%27s_Art_World_Tales_Poster.jpg/250px-Doraemon_Nobita%27s_Art_World_Tales_Poster.jpg',
    trailerUrl: 'https://www.youtube.com/embed/0Fse1acKOD4',
  },
  {
    tmdbId: null,
    title: 'Obsession',
    description:
      'A supernatural horror story about a wish that turns affection into a dangerous obsession.',
    durationMin: 109,
    releaseDate: '2026-05-15',
    ageRating: 'C18',
    genres: ['Kinh Dị', 'Giật Gân'],
    posterUrl: null,
    trailerUrl: null,
  },
  {
    tmdbId: null,
    title: 'Mang Me Di Bo',
    description: 'A Vietnamese family drama about love, regret, and the road back home.',
    durationMin: 112,
    releaseDate: '2026-07-01',
    ageRating: 'C13',
    genres: ['Chính Kịch', 'Gia Đình'],
    posterUrl: null,
    trailerUrl: null,
  },
  {
    tmdbId: null,
    title: '28 Years Later',
    description: 'A tense horror story set decades after a terrifying outbreak.',
    durationMin: 115,
    releaseDate: '2026-06-20',
    ageRating: 'C18',
    genres: ['Kinh Dị', 'Giật Gân'],
    posterUrl: 'https://upload.wikimedia.org/wikipedia/en/thumb/3/38/28_Years_Later_film_poster.jpg/250px-28_Years_Later_film_poster.jpg',
    trailerUrl: 'https://www.youtube.com/embed/IYGG55qwQZQ',
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
    username: 'admin',
    email: 'admin@cinema.test',
    password: '123123123',
    firstName: 'Admin',
    lastName: 'User',
    role: 'ADMIN',
  });
  const staffUser = await createUser({
    username: 'staff',
    email: 'staff@cinema.test',
    password: '123123123',
    firstName: 'Staff',
    lastName: 'User',
    role: 'STAFF',
  });
  const customerUser = await createUser({
    username: 'customer',
    id: 'cmr4ezer0000256u181u0ijfy',
    email: 'customer@cinema.test',
    password: '123123123',
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
  await createConcessionCombos();

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
    concessionComboCount: CONCESSION_COMBOS.length,
    currency: 'VND',
  });
}

async function clearDatabase() {
  await prisma.ticketCheckIn.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.bookingItem.deleteMany();
  await prisma.bookingComboItem.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.showtimeSeat.deleteMany();
  await prisma.showtime.deleteMany();
  await prisma.seat.deleteMany();
  await prisma.room.deleteMany();
  await prisma.cinemaTicketPrice.deleteMany();
  await prisma.cinema.deleteMany();
  await prisma.cinemaChain.deleteMany();
  await prisma.concessionCombo.deleteMany();
  await prisma.movieGenre.deleteMany();
  await prisma.movieReview.deleteMany();
  await prisma.genre.deleteMany();
  await prisma.movie.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();
}

function createUser({ id, username, email, password, firstName, lastName, role }) {
  return prisma.user.create({
    data: {
      id,
      username,
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
        tmdbId: movieConfig.tmdbId || null,
        description: movieConfig.description,
        durationMin: movieConfig.durationMin,
        releaseDate: new Date(`${movieConfig.releaseDate}T00:00:00.000+07:00`),
        ageRating: movieConfig.ageRating || 'P',
        posterUrl: movieConfig.posterUrl || null,
        trailerUrl: movieConfig.trailerUrl || null,
        status: 'NOW_SHOWING',
        genres: {
          create: movieConfig.genres.map((genreName) => ({
            genre: { connect: { id: genres.get(normalizeGenreName(genreName)).id } },
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
        city: 'Đà Nẵng',
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
        code: cinemaConfig.code,
        name: cinemaConfig.name,
        address: cinemaConfig.address,
        ward: cinemaConfig.ward,
        city: cinemaConfig.city || 'Đà Nẵng',
        phone: '+84-236-000-0000',
        email: `${slugify(cinemaConfig.name)}@cinema.test`,
        imageUrl: cinemaConfig.imageUrl,
      },
    });

    await createCinemaTicketPrices(cinema.id, cinemaConfig.chain);

    for (let roomIndex = 0; roomIndex < cinemaConfig.roomCount; roomIndex += 1) {
      const layout = ROOM_LAYOUTS[roomIndex % ROOM_LAYOUTS.length];
      const seatCount = countSeats(layout);
      const room = await prisma.room.create({
        data: {
          cinemaId: cinema.id,
          name: `Screen ${roomIndex + 1} - ${layout.label}`,
          capacity: seatCount,
        },
      });
      const seats = await createSeatLayout({ roomId: room.id, seatRows: layout.seatRows });
      roomSeatMap.push({ cinema, chainName: cinemaConfig.chain, room, seats, layout });
    }
  }

  return roomSeatMap;
}

async function createCinemaTicketPrices(cinemaId, chainName) {
  const priceSet = CINEMA_PRICE_BY_CHAIN[chainName] || PRICE_BY_SEAT_TYPE;
  await prisma.cinemaTicketPrice.createMany({
    data: Object.entries(priceSet).map(([seatType, price]) => ({
      cinemaId,
      seatType,
      price,
      isActive: true,
    })),
  });
}

function countSeats(layout) {
  return layout.seatRows.reduce((total, seatRow) => total + seatRow.positions.length, 0);
}

async function createSeatLayout({ roomId, seatRows }) {
  const seats = [];
  for (const seatRow of seatRows) {
    for (const [index, position] of seatRow.positions.entries()) {
      const seat = await prisma.seat.create({
        data: {
          roomId,
          row: seatRow.row,
          number: index + 1,
          position,
          type: seatRow.type || 'STANDARD',
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
  const roomInfoByRoomId = new Map(roomSeatMap.map((roomInfo) => [roomInfo.room.id, roomInfo]));

  for (const showtime of showtimes) {
    const roomInfo = roomInfoByRoomId.get(showtime.roomId);
    const seats = roomInfo?.seats || [];
    const priceSet = CINEMA_PRICE_BY_CHAIN[roomInfo?.chainName] || PRICE_BY_SEAT_TYPE;
    await prisma.showtime.update({
      where: { id: showtime.id },
      data: { basePrice: priceSet.STANDARD },
    });
    await prisma.showtimeSeat.createMany({
      data: seats.map((seat) => ({
        showtimeId: showtime.id,
        seatId: seat.id,
        price: priceSet[seat.type],
        status: 'AVAILABLE',
      })),
    });
  }
}

async function createConcessionCombos() {
  await prisma.concessionCombo.createMany({
    data: CONCESSION_COMBOS.map((combo) => ({
      ...combo,
      isActive: true,
    })),
  });
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
