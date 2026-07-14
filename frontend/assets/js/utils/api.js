/* CineTicket - API Layer with Mock Data */
const API = {
  baseUrl: '/api',
  backendBaseUrl: localStorage.getItem('cineticket_api_base') || `${window.location.protocol}//${window.location.hostname}:3000/api`,
  catalogLoadedFromBackend: false,
  moviePosterFallback: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="600" viewBox="0 0 400 600"%3E%3Crect width="400" height="600" fill="%23171717"/%3E%3Crect x="28" y="28" width="344" height="544" rx="18" fill="%23222222" stroke="%23444444"/%3E%3Ctext x="200" y="290" text-anchor="middle" fill="%23bbbbbb" font-family="Arial" font-size="28" font-weight="700"%3ECRTicket%3C/text%3E%3Ctext x="200" y="330" text-anchor="middle" fill="%23777777" font-family="Arial" font-size="18"%3EPoster dang cap nhat%3C/text%3E%3C/svg%3E',

  // ========== MOCK DATA ==========
  mockData: {
    movies: [
      {
        id: 'mv001', title: 'Láº­t Máº·t 7: Má»™t Äiá»u Æ¯á»›c', titleEn: 'Face Off 7',
        poster: 'https://picsum.photos/seed/latmat7/400/600',
        banner: 'https://picsum.photos/seed/latmat7b/1280/720',
        genre: ['HÃ nh Äá»™ng', 'HÃ i', 'Gia ÄÃ¬nh'], duration: 128, language: 'Tiáº¿ng Viá»‡t',
        rating: 8.2, description: 'Láº­t Máº·t 7 tiáº¿p tá»¥c hÃ nh trÃ¬nh cá»§a nhá»¯ng nhÃ¢n váº­t vá»›i nhá»¯ng cÃ¢u chuyá»‡n gia Ä‘Ã¬nh Ä‘áº§y xÃºc cáº£m, hÃ i hÆ°á»›c vÃ  báº¥t ngá». ÄÃ¢y lÃ  bá»™ phim khÃ´ng thá»ƒ bá» qua trong mÃ¹a hÃ¨ 2025.',
        cast: [
          { name: 'LÃ½ Háº£i', role: 'Äáº¡o diá»…n / Diá»…n viÃªn', avatar: 'https://picsum.photos/seed/lyhai/100/100' },
          { name: 'Minh HÃ ', role: 'Vai chÃ­nh', avatar: 'https://picsum.photos/seed/minhha/100/100' },
          { name: 'Trung DÅ©ng', role: 'Vai phá»¥', avatar: 'https://picsum.photos/seed/trungdung/100/100' },
          { name: 'Há»©a Minh Äáº¡t', role: 'Vai hÃ i', avatar: 'https://picsum.photos/seed/huaminh/100/100' }
        ],
        director: 'LÃ½ Háº£i', releaseDate: '2025-04-28', status: 'nowShowing',
        trailer: '', ageRating: 'P'
      },
      {
        id: 'mv002', title: 'Avengers: Doomsday', titleEn: 'Avengers: Doomsday',
        poster: 'https://picsum.photos/seed/avengers5/400/600',
        banner: 'https://picsum.photos/seed/avengers5b/1280/720',
        genre: ['HÃ nh Äá»™ng', 'PhiÃªu LÆ°u', 'Khoa Há»c Viá»…n TÆ°á»Ÿng'], duration: 150, language: 'Tiáº¿ng Anh (Phá»¥ Ä‘á»)',
        rating: 9.1, description: 'LiÃªn minh Avengers Ä‘á»‘i máº·t vá»›i káº» thÃ¹ nguy hiá»ƒm nháº¥t tá»« trÆ°á»›c Ä‘áº¿n nay. Má»™t tráº­n chiáº¿n cuá»‘i cÃ¹ng sáº½ quyáº¿t Ä‘á»‹nh sá»‘ pháº­n cá»§a cáº£ vÅ© trá»¥ Marvel.',
        cast: [
          { name: 'Robert Downey Jr.', role: 'Tony Stark', avatar: 'https://picsum.photos/seed/rdj/100/100' },
          { name: 'Chris Evans', role: 'Steve Rogers', avatar: 'https://picsum.photos/seed/cevans/100/100' },
          { name: 'Scarlett Johansson', role: 'Black Widow', avatar: 'https://picsum.photos/seed/sj/100/100' }
        ],
        director: 'Russo Brothers', releaseDate: '2025-05-01', status: 'nowShowing',
        trailer: '', ageRating: 'C13'
      },
      {
        id: 'mv003', title: 'KÃ­nh Váº¡n Hoa: Huyá»n Thoáº¡i Má»›i', titleEn: 'Kaleidoscope: New Legend',
        poster: 'https://picsum.photos/seed/kvh/400/600',
        banner: 'https://picsum.photos/seed/kvhb/1280/720',
        genre: ['Hoáº¡t HÃ¬nh', 'Gia ÄÃ¬nh', 'PhiÃªu LÆ°u'], duration: 95, language: 'Tiáº¿ng Viá»‡t',
        rating: 7.8, description: 'HÃ nh trÃ¬nh ká»³ diá»‡u cá»§a nhÃ³m báº¡n nhá» trong tháº¿ giá»›i KÃ­nh Váº¡n Hoa Ä‘áº§y mÃ u sáº¯c, nÆ¡i má»i Æ°á»›c mÆ¡ Ä‘á»u cÃ³ thá»ƒ trá»Ÿ thÃ nh hiá»‡n thá»±c.',
        cast: [
          { name: 'Diá»…n viÃªn lá»“ng tiáº¿ng', role: 'NhÃ¢n váº­t chÃ­nh', avatar: 'https://picsum.photos/seed/kvhcast/100/100' }
        ],
        director: 'Nguyá»…n VÄƒn A', releaseDate: '2025-04-15', status: 'nowShowing',
        trailer: '', ageRating: 'P'
      },
      {
        id: 'mv004', title: 'Mission: Impossible 8', titleEn: 'Mission: Impossible â€“ Dead Reckoning Part Two',
        poster: 'https://picsum.photos/seed/mi8/400/600',
        banner: 'https://picsum.photos/seed/mi8b/1280/720',
        genre: ['HÃ nh Äá»™ng', 'GiÃ¡n Äiá»‡p', 'PhiÃªu LÆ°u'], duration: 163, language: 'Tiáº¿ng Anh (Phá»¥ Ä‘á»)',
        rating: 8.7, description: 'Ethan Hunt trá»Ÿ láº¡i vá»›i nhiá»‡m vá»¥ nguy hiá»ƒm nháº¥t trong sá»± nghiá»‡p. Láº§n nÃ y, cáº£ tháº¿ giá»›i Ä‘ang Ä‘á»©ng trÆ°á»›c ngÆ°á»¡ng cá»­a diá»‡t vong.',
        cast: [
          { name: 'Tom Cruise', role: 'Ethan Hunt', avatar: 'https://picsum.photos/seed/tomcruise/100/100' },
          { name: 'Hayley Atwell', role: 'Grace', avatar: 'https://picsum.photos/seed/hayley/100/100' }
        ],
        director: 'Christopher McQuarrie', releaseDate: '2025-05-23', status: 'nowShowing',
        trailer: '', ageRating: 'C13'
      },
      {
        id: 'mv005', title: 'CÃ´ GÃ¡i Tá»« QuÃ¡ Khá»©', titleEn: 'The Girl From the Past',
        poster: 'https://picsum.photos/seed/cogirlpast/400/600',
        banner: 'https://picsum.photos/seed/cogirlpastb/1280/720',
        genre: ['TÃ¢m LÃ½', 'TÃ¬nh Cáº£m', 'BÃ­ áº¨n'], duration: 112, language: 'Tiáº¿ng Viá»‡t',
        rating: 7.5, description: 'Má»™t cÃ¢u chuyá»‡n tÃ¬nh yÃªu vÆ°á»£t thá»i gian, nÆ¡i nhá»¯ng kÃ½ á»©c tÆ°á»Ÿng chá»«ng Ä‘Ã£ máº¥t láº¡i há»“i sinh vÃ  thay Ä‘á»•i táº¥t cáº£.',
        cast: [
          { name: 'Kaity Nguyá»…n', role: 'Ná»¯ chÃ­nh', avatar: 'https://picsum.photos/seed/kaity/100/100' },
          { name: 'Will', role: 'Nam chÃ­nh', avatar: 'https://picsum.photos/seed/will/100/100' }
        ],
        director: 'Trá»‹nh ÄÃ¬nh LÃª Minh', releaseDate: '2025-06-05', status: 'nowShowing',
        trailer: '', ageRating: 'C13'
      },
      {
        id: 'mv006', title: 'Spider-Man: Beyond the Spider-Verse', titleEn: 'Spider-Man: Beyond the Spider-Verse',
        poster: 'https://picsum.photos/seed/spiderman4/400/600',
        banner: 'https://picsum.photos/seed/spiderman4b/1280/720',
        genre: ['Hoáº¡t HÃ¬nh', 'HÃ nh Äá»™ng', 'PhiÃªu LÆ°u'], duration: 140, language: 'Tiáº¿ng Anh (Phá»¥ Ä‘á»)',
        rating: 9.3, description: 'Miles Morales tiáº¿p tá»¥c hÃ nh trÃ¬nh xuyÃªn vÅ© trá»¥ nhá»‡n, Ä‘á»‘i máº·t vá»›i nhá»¯ng thÃ¡ch thá»©c chÆ°a tá»«ng cÃ³ trong lá»‹ch sá»­ Spider-Man.',
        cast: [
          { name: 'Shameik Moore', role: 'Miles Morales', avatar: 'https://picsum.photos/seed/shameik/100/100' },
          { name: 'Hailee Steinfeld', role: 'Gwen Stacy', avatar: 'https://picsum.photos/seed/hailee/100/100' }
        ],
        director: 'Joaquim Dos Santos', releaseDate: '2025-07-04', status: 'comingSoon',
        trailer: '', ageRating: 'P'
      },
      {
        id: 'mv007', title: 'QuÃ¡i Váº­t Biá»ƒn SÃ¢u', titleEn: 'Deep Sea Monster',
        poster: 'https://picsum.photos/seed/deepseamon/400/600',
        banner: 'https://picsum.photos/seed/deepseamonb/1280/720',
        genre: ['Kinh Dá»‹', 'HÃ nh Äá»™ng', 'Khoa Há»c Viá»…n TÆ°á»Ÿng'], duration: 118, language: 'Tiáº¿ng Viá»‡t',
        rating: 7.2, description: 'Má»™t sinh váº­t khá»•ng lá»“ tá»« Ä‘Ã¡y Ä‘áº¡i dÆ°Æ¡ng báº¯t Ä‘áº§u táº¥n cÃ´ng bá» biá»ƒn Viá»‡t Nam. NhÃ³m cÃ¡c nhÃ  khoa há»c vÃ  lÃ­nh Ä‘áº·c nhiá»‡m pháº£i tÃ¬m cÃ¡ch ngÄƒn cháº·n tháº£m há»a.',
        cast: [
          { name: 'VÃµ Cáº£nh', role: 'Nam chÃ­nh', avatar: 'https://picsum.photos/seed/vochanh/100/100' },
          { name: 'Diá»‡u Nhi', role: 'Ná»¯ chÃ­nh', avatar: 'https://picsum.photos/seed/dieunhi/100/100' }
        ],
        director: 'Báº£o NhÃ¢n', releaseDate: '2025-08-15', status: 'comingSoon',
        trailer: '', ageRating: 'C16'
      },
      {
        id: 'mv008', title: 'Jurassic World: Rebirth', titleEn: 'Jurassic World: Rebirth',
        poster: 'https://picsum.photos/seed/jwrebirth/400/600',
        banner: 'https://picsum.photos/seed/jwrebirthb/1280/720',
        genre: ['PhiÃªu LÆ°u', 'HÃ nh Äá»™ng', 'Khoa Há»c Viá»…n TÆ°á»Ÿng'], duration: 138, language: 'Tiáº¿ng Anh (Phá»¥ Ä‘á»)',
        rating: 8.0, description: 'Tháº¿ giá»›i khá»§ng long há»“i sinh vá»›i nhá»¯ng loÃ i má»›i Ä‘Ã¡ng sá»£ hÆ¡n bao giá» háº¿t. Má»™t Ä‘á»™i thÃ¡m hiá»ƒm dÅ©ng cáº£m bÆ°á»›c vÃ o vÃ¹ng Ä‘áº¥t tá»­ tháº§n.',
        cast: [
          { name: 'Scarlett Johansson', role: 'Ná»¯ chÃ­nh', avatar: 'https://picsum.photos/seed/sj2/100/100' },
          { name: 'Mahershala Ali', role: 'Nam chÃ­nh', avatar: 'https://picsum.photos/seed/mahershala/100/100' }
        ],
        director: 'Gareth Edwards', releaseDate: '2025-07-02', status: 'comingSoon',
        trailer: '', ageRating: 'C13'
      }
    ],

    cinemas: [
      {
        id: 'ci001', name: 'CGV Vincom Center', shortName: 'CGV Vincom',
        address: '72 LÃª ThÃ¡nh TÃ´n, Q.1, TP.HCM', city: 'Há»“ ChÃ­ Minh',
        phone: '028 3824 5678',
        facilities: ['Dolby Atmos', 'IMAX', '4DX', 'ScreenX', 'BÃ£i Ä‘á»— xe'],
        image: 'https://picsum.photos/seed/cgvvincom/600/400',
        lat: 10.7769, lng: 106.7009
      },
      {
        id: 'ci002', name: 'Lotte Cinema Landmark', shortName: 'Lotte Landmark',
        address: 'Táº§ng 5, Landmark 81, 720A Äiá»‡n BiÃªn Phá»§, Q. BÃ¬nh Tháº¡nh, TP.HCM',
        city: 'Há»“ ChÃ­ Minh',
        phone: '028 3626 7890',
        facilities: ['Dolby Atmos', '3D', 'Cafe'],
        image: 'https://picsum.photos/seed/lottelandmark/600/400',
        lat: 10.7951, lng: 106.7219
      },
      {
        id: 'ci003', name: 'Galaxy Cinema Nguyá»…n Du', shortName: 'Galaxy Nguyá»…n Du',
        address: '116 Nguyá»…n Du, Q.1, TP.HCM', city: 'Há»“ ChÃ­ Minh',
        phone: '028 3823 4567',
        facilities: ['3D', 'Dolby', 'Gháº¿ Ä‘Ã´i', 'CÄƒn tin'],
        image: 'https://picsum.photos/seed/galaxynguyendu/600/400',
        lat: 10.7771, lng: 106.6916
      }
    ],

    rooms: [
      { id: 'rm001', cinemaId: 'ci001', name: 'PhÃ²ng 1 - IMAX', type: 'IMAX', capacity: 300, rows: 12, cols: 20 },
      { id: 'rm002', cinemaId: 'ci001', name: 'PhÃ²ng 2 - 4DX', type: '4DX', capacity: 120, rows: 8, cols: 14 },
      { id: 'rm003', cinemaId: 'ci001', name: 'PhÃ²ng 3 - 2D', type: '2D', capacity: 200, rows: 10, cols: 18 },
      { id: 'rm004', cinemaId: 'ci001', name: 'PhÃ²ng 4 - 3D', type: '3D', capacity: 180, rows: 10, cols: 16 },
      { id: 'rm005', cinemaId: 'ci002', name: 'PhÃ²ng 1 - Dolby', type: 'Dolby', capacity: 160, rows: 10, cols: 14 },
      { id: 'rm006', cinemaId: 'ci002', name: 'PhÃ²ng 2 - 3D', type: '3D', capacity: 140, rows: 9, cols: 14 },
      { id: 'rm007', cinemaId: 'ci002', name: 'Phòng 3 - 2D', type: '2D', capacity: 80, rows: 6, cols: 10 },
      { id: 'rm008', cinemaId: 'ci003', name: 'PhÃ²ng 1 - 2D', type: '2D', capacity: 160, rows: 10, cols: 14 },
      { id: 'rm009', cinemaId: 'ci003', name: 'PhÃ²ng 2 - 3D', type: '3D', capacity: 140, rows: 9, cols: 14 },
      { id: 'rm010', cinemaId: 'ci003', name: 'PhÃ²ng 3 - Gháº¿ ÄÃ´i', type: '2D', capacity: 100, rows: 8, cols: 10 }
    ],

    users: [
      {
        id: 'u001', name: 'Admin CRTicket', email: 'admin@crticket.vn',
        phone: '0901234567', role: 'admin',
        password: 'admin123', avatar: null, createdAt: '2024-01-01', isActive: true
      },
      {
        id: 'u002', name: 'Nguyá»…n VÄƒn HÃ¹ng', email: 'hung@example.com',
        phone: '0912345678', role: 'user',
        password: 'user123', avatar: null, createdAt: '2024-06-15', isActive: true
      },
      {
        id: 'u003', name: 'Tráº§n Thá»‹ Lan', email: 'lan@example.com',
        phone: '0923456789', role: 'user',
        password: 'user123', avatar: null, createdAt: '2024-08-20', isActive: true
      }
    ],

    showtimes: [],
    bookings: [],
    tickets: []
  },

  // ========== SEED SHOWTIMES ==========
  _seedShowtimes() {
    const showtimes = [];
    const today = new Date();
    const movies = ['mv001', 'mv002', 'mv003', 'mv004', 'mv005'];
    const roomSets = [
      { cinemaId: 'ci001', rooms: ['rm001', 'rm002', 'rm003'] },
      { cinemaId: 'ci002', rooms: ['rm005', 'rm006'] },
      { cinemaId: 'ci003', rooms: ['rm008', 'rm009'] }
    ];
    const times = ['09:00', '11:30', '14:00', '16:30', '19:00', '21:30'];
    const prices = { 'IMAX': { normal: 80000, couple: 180000 }, '4DX': { normal: 80000, couple: 180000 }, 'Dolby': { normal: 80000, couple: 180000 }, '2D': { normal: 80000, couple: 180000 }, '3D': { normal: 80000, couple: 180000 } };

    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const date = new Date(today);
      date.setDate(today.getDate() + dayOffset);
      const dateStr = Helpers.getDateString(date);

      movies.forEach(movieId => {
        roomSets.forEach(({ cinemaId, rooms }) => {
          rooms.slice(0, 2).forEach(roomId => {
            const room = this.mockData.rooms.find(r => r.id === roomId);
            if (!room) return;
            const roomTimes = times.slice(0, 4);
            roomTimes.forEach(startTime => {
              const movieData = this.mockData.movies.find(m => m.id === movieId);
              if (!movieData) return;
              const startParts = startTime.split(':');
              const startMins = parseInt(startParts[0]) * 60 + parseInt(startParts[1]);
              const endMins = startMins + movieData.duration + 15;
              const endH = Math.floor(endMins / 60) % 24;
              const endM = endMins % 60;
              const endTime = `${String(endH).padStart(2,'0')}:${String(endM).padStart(2,'0')}`;
              const roomType = room.type;
              const priceSet = prices[roomType] || prices['2D'];
              const totalSeats = room.rows * room.cols;
              const bookedCount = Math.floor(Math.random() * totalSeats * 0.6);
              showtimes.push({
                id: `st_${movieId}_${roomId}_${dateStr}_${startTime.replace(':','')}`,
                movieId, cinemaId, roomId, date: dateStr,
                startTime, endTime,
                price: priceSet, totalSeats, bookedSeats: bookedCount
              });
            });
          });
        });
      });
    }
    return showtimes;
  },

  // ========== INIT ==========
  async init() {
    if (!localStorage.getItem('cineticket_seeded')) {
      this.mockData.showtimes = this._seedShowtimes();
      localStorage.setItem('cineticket_movies', JSON.stringify(this.mockData.movies));
      localStorage.setItem('cineticket_cinemas', JSON.stringify(this.mockData.cinemas));
      localStorage.setItem('cineticket_rooms', JSON.stringify(this.mockData.rooms));
      localStorage.setItem('cineticket_users', JSON.stringify(this.mockData.users));
      localStorage.setItem('cineticket_showtimes', JSON.stringify(this.mockData.showtimes));
      localStorage.setItem('cineticket_bookings', JSON.stringify([]));
      localStorage.setItem('cineticket_tickets', JSON.stringify([]));
      localStorage.setItem('cineticket_seeded', '1');
    } else {
      this.mockData.movies = JSON.parse(localStorage.getItem('cineticket_movies') || '[]');
      this.mockData.cinemas = JSON.parse(localStorage.getItem('cineticket_cinemas') || '[]');
      this.mockData.rooms = JSON.parse(localStorage.getItem('cineticket_rooms') || '[]');
      this.mockData.users = JSON.parse(localStorage.getItem('cineticket_users') || '[]');
      this.mockData.showtimes = JSON.parse(localStorage.getItem('cineticket_showtimes') || '[]');
      this.mockData.bookings = JSON.parse(localStorage.getItem('cineticket_bookings') || '[]');
      this.mockData.tickets = JSON.parse(localStorage.getItem('cineticket_tickets') || '[]');
    }
    await this.syncBackendCatalog();
  },

  async syncBackendCatalog() {
    try {
      const data = await this.getBackendMovies();
      const movies = (data.movies || []).map((movie) => this._mapBackendMovie(movie));
      if (movies.length === 0) return;

      const showtimes = [];
      const cinemasById = new Map();
      const roomsById = new Map();

      for (const movie of movies) {
        const showtimeData = await this.getBackendMovieShowtimes(movie.id);
        (showtimeData.showtimes || []).forEach((showtime) => {
          showtimes.push(this._mapBackendShowtime(showtime));
          if (showtime.cinema) cinemasById.set(showtime.cinema.id, this._mapBackendCinema(showtime.cinema));
          if (showtime.room) roomsById.set(showtime.room.id, this._mapBackendRoom(showtime.room, showtime.cinema));
        });
      }

      try {
        const adminCinemas = await this.getAdminCinemas();
        (adminCinemas || []).forEach((cinema) => {
          cinemasById.set(cinema.id, this._mapBackendCinema(cinema));
          (cinema.rooms || []).forEach((room) => {
            roomsById.set(room.id, this._mapBackendRoom(room, cinema));
          });
        });
      } catch (error) {
        console.warn('Admin cinema catalog is unavailable:', error);
      }

      this.mockData.movies = movies;
      this.mockData.showtimes = showtimes;
      if (cinemasById.size > 0) this.mockData.cinemas = [...cinemasById.values()];
      if (roomsById.size > 0) this.mockData.rooms = [...roomsById.values()];
      this.catalogLoadedFromBackend = true;

      this._save('movies');
      this._save('showtimes');
      this._save('cinemas');
      this._save('rooms');
    } catch (error) {
      this.catalogLoadedFromBackend = false;
      console.error('Backend catalog is unavailable:', error);
    }
  },

  _mapBackendMovie(movie) {
    return {
      id: movie.id,
      title: movie.title,
      titleEn: movie.titleEn || movie.title,
      poster: movie.poster || this.moviePosterFallback,
      banner: movie.banner || movie.poster || this.moviePosterFallback,
      genre: movie.genre || [],
      duration: movie.duration || 0,
      language: movie.language || 'Dang cap nhat',
      rating: movie.ratingAverage || movie.rating || 0,
      ratingCount: movie.ratingCount || 0,
      description: movie.description || '',
      cast: [],
      director: movie.director || 'Dang cap nhat',
      releaseDate: movie.releaseDate || new Date().toISOString(),
      endDate: movie.endDate || null,
      status: movie.status || 'nowShowing',
      trailer: movie.trailer || '',
      ageRating: movie.ageRating || 'P',
      backend: true,
    };
  },

  _mapBackendShowtime(showtime) {
    return {
      id: showtime.id,
      movieId: showtime.movieId,
      chainId: showtime.chainId || (showtime.chain && showtime.chain.id) || showtime.cinemaId,
      chain: showtime.chain || null,
      cinemaId: showtime.cinemaId,
      roomId: showtime.roomId,
      date: showtime.date,
      startTime: showtime.startTime,
      endTime: showtime.endTime,
      price: showtime.price || { normal: 0, couple: 0 },
      totalSeats: showtime.totalSeats || 0,
      bookedSeats: showtime.bookedSeats || 0,
      backend: true,
    };
  },

  _mapBackendCinema(cinema) {
    const localCinemaImage = this._localCinemaImage(cinema);
    const imageUrl = localCinemaImage || cinema.imageUrl || '';
    return {
      id: cinema.id,
      code: cinema.code || '',
      chainId: cinema.chainId || (cinema.chain && cinema.chain.id) || cinema.id,
      chain: cinema.chain || null,
      name: cinema.name,
      shortName: cinema.shortName || cinema.name,
      address: cinema.address || '',
      ward: cinema.ward || '',
      city: cinema.city || '',
      phone: cinema.phone || '',
      imageUrl,
      facilities: ['2D'],
      image: imageUrl || `https://picsum.photos/seed/${cinema.id}/600/400`,
    };
  },

  // Chuẩn hóa ảnh rạp CR từ asset local để không phụ thuộc dữ liệu cache/localStorage cũ.
  _localCinemaImage(cinema) {
    const code = String(cinema?.code || '').toUpperCase();
    const name = String(cinema?.name || cinema?.shortName || '').toLowerCase();
    const images = {
      CR01: '/assets/images/cinemas/cr01-riverside.jpg',
      CR02: '/assets/images/cinemas/cr02-central-park.jpg',
      CR03: '/assets/images/cinemas/cr03-ocean-view.jpg',
      CR04: '/assets/images/cinemas/cr04-marble-mountain.jpg',
      CR05: '/assets/images/cinemas/cr05-northwest.jpg',
      CR06: '/assets/images/cinemas/cr06-green-square.jpg',
      CR07: '/assets/images/cinemas/cr07-golden-hills.jpg',
    };
    if (images[code]) return images[code];
    if (name.includes('riverside')) return images.CR01;
    if (name.includes('central park')) return images.CR02;
    if (name.includes('ocean view')) return images.CR03;
    if (name.includes('marble mountain')) return images.CR04;
    if (name.includes('northwest')) return images.CR05;
    if (name.includes('green square')) return images.CR06;
    if (name.includes('golden hills')) return images.CR07;
    return '';
  },

  _mapBackendRoom(room, cinema) {
    return {
      id: room.id,
      cinemaId: room.cinemaId || (cinema ? cinema.id : ''),
      name: room.name,
      type: room.type || '2D',
      capacity: room.capacity || 0,
      rows: room.rows || 0,
      cols: room.cols || 0,
      seatTypeSummary: room.seatTypeSummary || {},
    };
  },

  getBackendUserId() {
    const user = State && State.get ? State.get('currentUser') : null;
    if (!user || !user.backendUserId) {
      throw new Error('TÃ i khoáº£n hiá»‡n táº¡i chÆ°a liÃªn káº¿t database. Vui lÃ²ng Ä‘Äƒng xuáº¥t vÃ  Ä‘Äƒng nháº­p láº¡i.');
    }
    return user.backendUserId;
  },

  getSeatHoldSessionId() {
    let sessionId = localStorage.getItem('cineticket_hold_session_id');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      localStorage.setItem('cineticket_hold_session_id', sessionId);
    }
    return sessionId;
  },

  async backendRequest(path, options = {}) {
    const currentUser = typeof State !== 'undefined' && State.get ? State.get('currentUser') : null;
    const authorization = currentUser?.accessToken
      ? { Authorization: `Bearer ${currentUser.accessToken}` }
      : {};
    const response = await fetch(`${this.backendBaseUrl}${path}`, {
      headers: {
        'Content-Type': 'application/json',
        ...authorization,
        ...(options.headers || {})
      },
      ...options
    });
    const text = await response.text();
    const payload = text ? JSON.parse(text) : null;
    if (!response.ok) {
      const message = payload && payload.message
        ? Array.isArray(payload.message) ? payload.message.join(', ') : payload.message
        : 'Backend request failed';
      throw new Error(message);
    }
    return payload;
  },

  getShowtimeSeats(showtimeId) {
    const params = new URLSearchParams({
      sessionId: this.getSeatHoldSessionId(),
    });
    const user = State && State.get ? State.get('currentUser') : null;
    if (user && user.backendUserId) params.set('userId', user.backendUserId);
    return this.backendRequest(`/showtimes/${showtimeId}/seats?${params.toString()}`);
  },

  holdSeat(data) {
    const user = State && State.get ? State.get('currentUser') : null;
    return this.backendRequest('/seat-holds', {
      method: 'POST',
      body: JSON.stringify({
        ...data,
        sessionId: this.getSeatHoldSessionId(),
        userId: user && user.backendUserId ? user.backendUserId : undefined,
      })
    });
  },

  releaseSeat(showtimeSeatId) {
    const params = new URLSearchParams({
      sessionId: this.getSeatHoldSessionId(),
    });
    const user = State && State.get ? State.get('currentUser') : null;
    if (user && user.backendUserId) params.set('userId', user.backendUserId);
    return this.backendRequest(`/seat-holds/${showtimeSeatId}?${params.toString()}`, {
      method: 'DELETE'
    });
  },

  login(data) {
    return this.backendRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  register(data) {
    return this.backendRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  getBackendMovies() {
    return this.backendRequest('/movies');
  },

  getBackendMovie(movieId) {
    return this.backendRequest(`/movies/${movieId}`);
  },

  getBackendMovieShowtimes(movieId) {
    return this.backendRequest(`/movies/${movieId}/showtimes`);
  },

  getMovieReviews(movieId, userId) {
    const params = new URLSearchParams();
    if (userId) params.set('userId', userId);
    const query = params.toString();
    return this.backendRequest(`/movies/${movieId}/reviews${query ? `?${query}` : ''}`);
  },

  createMovieReview(movieId, data) {
    return this.backendRequest(`/movies/${movieId}/reviews`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  createBooking(data) {
    return this.backendRequest('/bookings', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  payBooking(bookingId) {
    return this.backendRequest(`/bookings/${bookingId}/pay`, {
      method: 'POST'
    });
  },

  createSepayPayment(bookingId) {
    return this.backendRequest(`/bookings/${bookingId}/sepay`, { method: 'POST' });
  },

  getPaymentStatus(bookingId) {
    return this.backendRequest(`/bookings/${bookingId}/payment-status`);
  },

  getConcessionCombos() {
    return this.backendRequest('/concession-combos');
  },

  updateBookingCombos(bookingId, items) {
    return this.backendRequest(`/bookings/${bookingId}/combos`, {
      method: 'PATCH',
      body: JSON.stringify({ items })
    });
  },

  cancelBooking(bookingId) {
    return this.backendRequest(`/bookings/${bookingId}`, {
      method: 'DELETE'
    });
  },

  expireBookings() {
    return this.backendRequest('/bookings/expire', {
      method: 'POST'
    });
  },

  getAdminBookings() {
    return this.backendRequest('/bookings');
  },

  getAdminBookingDetail(bookingId) {
    return this.backendRequest(`/bookings/${bookingId}`);
  },

  getAdminDashboard() {
    return this.backendRequest('/admin/dashboard');
  },

  getAdminDashboardShowtimes(date) {
    return this.backendRequest(`/admin/dashboard/showtimes?date=${encodeURIComponent(date)}`);
  },

  getAdminRevenue(days = 30) {
    return this.backendRequest(`/admin/revenue?days=${encodeURIComponent(days)}`);
  },

  getAdminUsers(role) {
    const query = role ? `?role=${encodeURIComponent(role)}` : '';
    return this.backendRequest(`/admin/users${query}`);
  },

  createAdminStaff(data) {
    return this.backendRequest('/admin/staff', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  getAdminStaffDetail(staffId) {
    return this.backendRequest(`/admin/staff/${encodeURIComponent(staffId)}`);
  },

  removeAdminStaff(staffId) {
    return this.backendRequest(`/admin/staff/${encodeURIComponent(staffId)}`, {
      method: 'DELETE',
    });
  },

  getMyStaffAttendance(month) {
    const query = month ? `?month=${encodeURIComponent(month)}` : '';
    return this.backendRequest(`/staff/attendance${query}`);
  },

  staffCheckIn(shiftCode) {
    return this.backendRequest('/staff/attendance/check-in', {
      method: 'POST',
      body: JSON.stringify({ shiftCode }),
    });
  },

  staffCheckOut() {
    return this.backendRequest('/staff/attendance/check-out', { method: 'POST' });
  },

  getAdminMovies() {
    return this.backendRequest('/admin/movies');
  },

  getAdminMovieSales(movieId) {
    return this.backendRequest(`/admin/movies/${movieId}/sales`);
  },

  getAdminCinemas() {
    return this.backendRequest('/admin/cinemas');
  },

  getAdminCinemaOverview(cinemaId) {
    return this.backendRequest(`/admin/cinemas/${cinemaId}/overview`);
  },

  getAdminCinemaDetail(cinemaId) {
    return this.backendRequest(`/admin/cinemas/${cinemaId}/detail`);
  },

  updateAdminCinema(id, data) {
    return this.backendRequest(`/admin/cinemas/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  },

  getAdminRooms() {
    return this.backendRequest('/admin/rooms');
  },

  getAdminRoomHistory(roomId) {
    return this.backendRequest(`/admin/rooms/${roomId}/history`);
  },

  getAdminSeats() {
    return this.backendRequest('/admin/seats');
  },

  updateAdminRoom(id, data) {
    return this.backendRequest(`/admin/rooms/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  },

  getAdminShowtimes() {
    return this.backendRequest('/admin/showtimes');
  },

  getAdminRoomAvailableSlots(roomId, movieId, date) {
    const params = new URLSearchParams({ movieId, date });
    return this.backendRequest(`/admin/rooms/${roomId}/available-slots?${params.toString()}`);
  },

  getCinemaTicketPrices(cinemaId) {
    return this.backendRequest(`/admin/cinemas/${cinemaId}/ticket-prices`);
  },

  upsertCinemaTicketPrice(cinemaId, data) {
    return this.backendRequest(`/admin/cinemas/${cinemaId}/ticket-prices`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  getAdminConcessionCombos() {
    return this.backendRequest('/admin/concession-combos');
  },

  createAdminConcessionCombo(data) {
    return this.backendRequest('/admin/concession-combos', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  updateAdminConcessionCombo(id, data) {
    return this.backendRequest(`/admin/concession-combos/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  },

  deleteAdminConcessionCombo(id) {
    return this.backendRequest(`/admin/concession-combos/${id}`, {
      method: 'DELETE'
    });
  },

  createAdminShowtime(data) {
    return this.backendRequest('/admin/showtimes', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  createAdminMovieFromTmdb(tmdbId, releaseDate, endDate) {
    return this.backendRequest('/admin/movies/tmdb', {
      method: 'POST',
      body: JSON.stringify({ tmdbId, releaseDate, endDate })
    });
  },

  updateAdminMovie(id, data) {
    return this.backendRequest(`/admin/movies/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  },

  deleteAdminMovie(movieId) {
    return this.backendRequest(`/admin/movies/${movieId}`, {
      method: 'DELETE'
    });
  },

  getBookingTickets(bookingId) {
    return this.backendRequest(`/bookings/${bookingId}/tickets`);
  },

  getBookingByQr(bookingQrToken) {
    return this.backendRequest(`/bookings/qr/${encodeURIComponent(bookingQrToken)}`);
  },

  checkInBookingByQr(bookingQrToken, data = {}) {
    return this.backendRequest(`/bookings/qr/${encodeURIComponent(bookingQrToken)}/check-in`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  getTicketByQr(qrToken) {
    return this.backendRequest(`/tickets/qr/${encodeURIComponent(qrToken)}`);
  },

  checkInTicket(qrToken, data = {}) {
    return this.backendRequest(`/tickets/qr/${encodeURIComponent(qrToken)}/check-in`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  getUserTickets(userId) {
    return this.backendRequest(`/users/${userId}/tickets`);
  },

  getUserBookings(userId) {
    return this.backendRequest(`/users/${encodeURIComponent(userId)}/bookings`);
  },

  updateUserProfile(userId, data) {
    return this.backendRequest(`/users/${encodeURIComponent(userId)}/profile`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  },

  _save(key) {
    localStorage.setItem('cineticket_' + key, JSON.stringify(this.mockData[key]));
  },

  // ========== HTTP-LIKE METHODS (MOCK) ==========
  async get(endpoint) {
    await this._delay();
    const parts = endpoint.replace('/api/', '').split('/');
    const resource = parts[0];
    const id = parts[1];
    if (id) {
      const item = (this.mockData[resource] || []).find(i => i.id === id);
      return item ? { data: item } : { error: 'Not found', status: 404 };
    }
    return { data: this.mockData[resource] || [] };
  },

  async post(endpoint, data) {
    await this._delay();
    const resource = endpoint.replace('/api/', '').split('/')[0];
    const newItem = { ...data, id: data.id || Helpers.generateId(), createdAt: new Date().toISOString() };
    if (!this.mockData[resource]) this.mockData[resource] = [];
    this.mockData[resource].push(newItem);
    this._save(resource);
    return { data: newItem };
  },

  async put(endpoint, data) {
    await this._delay();
    const parts = endpoint.replace('/api/', '').split('/');
    const resource = parts[0];
    const id = parts[1];
    const idx = (this.mockData[resource] || []).findIndex(i => i.id === id);
    if (idx === -1) return { error: 'Not found', status: 404 };
    this.mockData[resource][idx] = { ...this.mockData[resource][idx], ...data };
    this._save(resource);
    return { data: this.mockData[resource][idx] };
  },

  async delete(endpoint) {
    await this._delay();
    const parts = endpoint.replace('/api/', '').split('/');
    const resource = parts[0];
    const id = parts[1];
    const idx = (this.mockData[resource] || []).findIndex(i => i.id === id);
    if (idx === -1) return { error: 'Not found', status: 404 };
    this.mockData[resource].splice(idx, 1);
    this._save(resource);
    return { data: { success: true } };
  },

  _delay(ms = 50) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
};
