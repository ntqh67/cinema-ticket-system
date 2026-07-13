/**
 * Mục đích: Mã nguồn phục vụ khởi tạo và tiện ích dùng chung; các khối bên dưới được giữ tách biệt theo trách nhiệm.
 */
/* CineTicket - Lớp giao tiếp API và dữ liệu mô phỏng */
// Đối tượng API gom toàn bộ lời gọi backend và bước ánh xạ dữ liệu trả về.
const API = {
  baseUrl: '/api',
  backendBaseUrl: localStorage.getItem('cineticket_api_base') || `${window.location.protocol}//${window.location.hostname}:3000/api`,
  catalogLoadedFromBackend: false,
  moviePosterFallback: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="600" viewBox="0 0 400 600"%3E%3Crect width="400" height="600" fill="%23171717"/%3E%3Crect x="28" y="28" width="344" height="544" rx="18" fill="%23222222" stroke="%23444444"/%3E%3Ctext x="200" y="290" text-anchor="middle" fill="%23bbbbbb" font-family="Arial" font-size="28" font-weight="700"%3ECRTicket%3C/text%3E%3Ctext x="200" y="330" text-anchor="middle" fill="%23777777" font-family="Arial" font-size="18"%3EPoster dang cap nhat%3C/text%3E%3C/svg%3E',

  // ========== MOCK DATA ==========
  mockData: {
    movies: [
      {
        id: 'mv001', title: 'Lật Mặt 7: Một Điều Ước', titleEn: 'Face Off 7',
        poster: 'https://picsum.photos/seed/latmat7/400/600',
        banner: 'https://picsum.photos/seed/latmat7b/1280/720',
        genre: ['Hành Động', 'Hài', 'Gia Đình'], duration: 128, language: 'Tiếng Việt',
        rating: 8.2, description: 'Lật Mặt 7 tiếp tục hành trình của những nhân vật với những câu chuyện gia đình đầy xúc cảm, hài hước và bất ngờ. Đây là bộ phim không thể bỏ qua trong mùa hè 2025.',
        cast: [
          { name: 'Lý Hải', role: 'Đạo diễn / Diễn viên', avatar: 'https://picsum.photos/seed/lyhai/100/100' },
          { name: 'Minh Hà', role: 'Vai chính', avatar: 'https://picsum.photos/seed/minhha/100/100' },
          { name: 'Trung Dũng', role: 'Vai phụ', avatar: 'https://picsum.photos/seed/trungdung/100/100' },
          { name: 'Hứa Minh Đạt', role: 'Vai hài', avatar: 'https://picsum.photos/seed/huaminh/100/100' }
        ],
        director: 'Lý Hải', releaseDate: '2025-04-28', status: 'nowShowing',
        trailer: '', ageRating: 'P'
      },
      {
        id: 'mv002', title: 'Avengers: Doomsday', titleEn: 'Avengers: Doomsday',
        poster: 'https://picsum.photos/seed/avengers5/400/600',
        banner: 'https://picsum.photos/seed/avengers5b/1280/720',
        genre: ['Hành Động', 'Phiêu Lưu', 'Khoa Học Viễn Tưởng'], duration: 150, language: 'Tiếng Anh (Phụ đề)',
        rating: 9.1, description: 'Liên minh Avengers đối mặt với kẻ thù nguy hiểm nhất từ trước đến nay. Một trận chiến cuối cùng sẽ quyết định số phận của cả vũ trụ Marvel.',
        cast: [
          { name: 'Robert Downey Jr.', role: 'Tony Stark', avatar: 'https://picsum.photos/seed/rdj/100/100' },
          { name: 'Chris Evans', role: 'Steve Rogers', avatar: 'https://picsum.photos/seed/cevans/100/100' },
          { name: 'Scarlett Johansson', role: 'Black Widow', avatar: 'https://picsum.photos/seed/sj/100/100' }
        ],
        director: 'Russo Brothers', releaseDate: '2025-05-01', status: 'nowShowing',
        trailer: '', ageRating: 'C13'
      },
      {
        id: 'mv003', title: 'Kính Vạn Hoa: Huyền Thoại Mới', titleEn: 'Kaleidoscope: New Legend',
        poster: 'https://picsum.photos/seed/kvh/400/600',
        banner: 'https://picsum.photos/seed/kvhb/1280/720',
        genre: ['Hoạt Hình', 'Gia Đình', 'Phiêu Lưu'], duration: 95, language: 'Tiếng Việt',
        rating: 7.8, description: 'Hành trình kỳ diệu của nhóm bạn nhỏ trong thế giới Kính Vạn Hoa đầy màu sắc, nơi mọi ước mơ đều có thể trở thành hiện thực.',
        cast: [
          { name: 'Diễn viên lồng tiếng', role: 'Nhân vật chính', avatar: 'https://picsum.photos/seed/kvhcast/100/100' }
        ],
        director: 'Nguyễn Văn A', releaseDate: '2025-04-15', status: 'nowShowing',
        trailer: '', ageRating: 'P'
      },
      {
        id: 'mv004', title: 'Mission: Impossible 8', titleEn: 'Mission: Impossible – Dead Reckoning Part Two',
        poster: 'https://picsum.photos/seed/mi8/400/600',
        banner: 'https://picsum.photos/seed/mi8b/1280/720',
        genre: ['Hành Động', 'Gián Điệp', 'Phiêu Lưu'], duration: 163, language: 'Tiếng Anh (Phụ đề)',
        rating: 8.7, description: 'Ethan Hunt trở lại với nhiệm vụ nguy hiểm nhất trong sự nghiệp. Lần này, cả thế giới đang đứng trước ngưỡng cửa diệt vong.',
        cast: [
          { name: 'Tom Cruise', role: 'Ethan Hunt', avatar: 'https://picsum.photos/seed/tomcruise/100/100' },
          { name: 'Hayley Atwell', role: 'Grace', avatar: 'https://picsum.photos/seed/hayley/100/100' }
        ],
        director: 'Christopher McQuarrie', releaseDate: '2025-05-23', status: 'nowShowing',
        trailer: '', ageRating: 'C13'
      },
      {
        id: 'mv005', title: 'Cô Gái Từ Quá Khứ', titleEn: 'The Girl From the Past',
        poster: 'https://picsum.photos/seed/cogirlpast/400/600',
        banner: 'https://picsum.photos/seed/cogirlpastb/1280/720',
        genre: ['Tâm Lý', 'Tình Cảm', 'Bí Ẩn'], duration: 112, language: 'Tiếng Việt',
        rating: 7.5, description: 'Một câu chuyện tình yêu vượt thời gian, nơi những ký ức tưởng chừng đã mất lại hồi sinh và thay đổi tất cả.',
        cast: [
          { name: 'Kaity Nguyễn', role: 'Nữ chính', avatar: 'https://picsum.photos/seed/kaity/100/100' },
          { name: 'Will', role: 'Nam chính', avatar: 'https://picsum.photos/seed/will/100/100' }
        ],
        director: 'Trịnh Đình Lê Minh', releaseDate: '2025-06-05', status: 'nowShowing',
        trailer: '', ageRating: 'C13'
      },
      {
        id: 'mv006', title: 'Spider-Man: Beyond the Spider-Verse', titleEn: 'Spider-Man: Beyond the Spider-Verse',
        poster: 'https://picsum.photos/seed/spiderman4/400/600',
        banner: 'https://picsum.photos/seed/spiderman4b/1280/720',
        genre: ['Hoạt Hình', 'Hành Động', 'Phiêu Lưu'], duration: 140, language: 'Tiếng Anh (Phụ đề)',
        rating: 9.3, description: 'Miles Morales tiếp tục hành trình xuyên vũ trụ nhện, đối mặt với những thách thức chưa từng có trong lịch sử Spider-Man.',
        cast: [
          { name: 'Shameik Moore', role: 'Miles Morales', avatar: 'https://picsum.photos/seed/shameik/100/100' },
          { name: 'Hailee Steinfeld', role: 'Gwen Stacy', avatar: 'https://picsum.photos/seed/hailee/100/100' }
        ],
        director: 'Joaquim Dos Santos', releaseDate: '2025-07-04', status: 'comingSoon',
        trailer: '', ageRating: 'P'
      },
      {
        id: 'mv007', title: 'Quái Vật Biển Sâu', titleEn: 'Deep Sea Monster',
        poster: 'https://picsum.photos/seed/deepseamon/400/600',
        banner: 'https://picsum.photos/seed/deepseamonb/1280/720',
        genre: ['Kinh Dị', 'Hành Động', 'Khoa Học Viễn Tưởng'], duration: 118, language: 'Tiếng Việt',
        rating: 7.2, description: 'Một sinh vật khổng lồ từ đáy đại dương bắt đầu tấn công bờ biển Việt Nam. Nhóm các nhà khoa học và lính đặc nhiệm phải tìm cách ngăn chặn thảm họa.',
        cast: [
          { name: 'Võ Cảnh', role: 'Nam chính', avatar: 'https://picsum.photos/seed/vochanh/100/100' },
          { name: 'Diệu Nhi', role: 'Nữ chính', avatar: 'https://picsum.photos/seed/dieunhi/100/100' }
        ],
        director: 'Bảo Nhân', releaseDate: '2025-08-15', status: 'comingSoon',
        trailer: '', ageRating: 'C16'
      },
      {
        id: 'mv008', title: 'Jurassic World: Rebirth', titleEn: 'Jurassic World: Rebirth',
        poster: 'https://picsum.photos/seed/jwrebirth/400/600',
        banner: 'https://picsum.photos/seed/jwrebirthb/1280/720',
        genre: ['Phiêu Lưu', 'Hành Động', 'Khoa Học Viễn Tưởng'], duration: 138, language: 'Tiếng Anh (Phụ đề)',
        rating: 8.0, description: 'Thế giới khủng long hồi sinh với những loài mới đáng sợ hơn bao giờ hết. Một đội thám hiểm dũng cảm bước vào vùng đất tử thần.',
        cast: [
          { name: 'Scarlett Johansson', role: 'Nữ chính', avatar: 'https://picsum.photos/seed/sj2/100/100' },
          { name: 'Mahershala Ali', role: 'Nam chính', avatar: 'https://picsum.photos/seed/mahershala/100/100' }
        ],
        director: 'Gareth Edwards', releaseDate: '2025-07-02', status: 'comingSoon',
        trailer: '', ageRating: 'C13'
      }
    ],

    cinemas: [
      {
        id: 'ci001', name: 'CGV Vincom Center', shortName: 'CGV Vincom',
        address: '72 Lê Thánh Tôn, Q.1, TP.HCM', city: 'Hồ Chí Minh',
        phone: '028 3824 5678',
        facilities: ['Dolby Atmos', 'IMAX', '4DX', 'ScreenX', 'Bãi đỗ xe'],
        image: 'https://picsum.photos/seed/cgvvincom/600/400',
        lat: 10.7769, lng: 106.7009
      },
      {
        id: 'ci002', name: 'Lotte Cinema Landmark', shortName: 'Lotte Landmark',
        address: 'Tầng 5, Landmark 81, 720A Điện Biên Phủ, Q. Bình Thạnh, TP.HCM',
        city: 'Hồ Chí Minh',
        phone: '028 3626 7890',
        facilities: ['Dolby Atmos', '3D', 'Ghế VIP', 'Cafe'],
        image: 'https://picsum.photos/seed/lottelandmark/600/400',
        lat: 10.7951, lng: 106.7219
      },
      {
        id: 'ci003', name: 'Galaxy Cinema Nguyễn Du', shortName: 'Galaxy Nguyễn Du',
        address: '116 Nguyễn Du, Q.1, TP.HCM', city: 'Hồ Chí Minh',
        phone: '028 3823 4567',
        facilities: ['3D', 'Dolby', 'Ghế đôi', 'Căn tin'],
        image: 'https://picsum.photos/seed/galaxynguyendu/600/400',
        lat: 10.7771, lng: 106.6916
      }
    ],

    rooms: [
      { id: 'rm001', cinemaId: 'ci001', name: 'Phòng 1 - IMAX', type: 'IMAX', capacity: 300, rows: 12, cols: 20 },
      { id: 'rm002', cinemaId: 'ci001', name: 'Phòng 2 - 4DX', type: '4DX', capacity: 120, rows: 8, cols: 14 },
      { id: 'rm003', cinemaId: 'ci001', name: 'Phòng 3 - 2D', type: '2D', capacity: 200, rows: 10, cols: 18 },
      { id: 'rm004', cinemaId: 'ci001', name: 'Phòng 4 - 3D', type: '3D', capacity: 180, rows: 10, cols: 16 },
      { id: 'rm005', cinemaId: 'ci002', name: 'Phòng 1 - Dolby', type: 'Dolby', capacity: 160, rows: 10, cols: 14 },
      { id: 'rm006', cinemaId: 'ci002', name: 'Phòng 2 - 3D', type: '3D', capacity: 140, rows: 9, cols: 14 },
      { id: 'rm007', cinemaId: 'ci002', name: 'Phòng 3 - VIP', type: 'VIP', capacity: 80, rows: 6, cols: 10 },
      { id: 'rm008', cinemaId: 'ci003', name: 'Phòng 1 - 2D', type: '2D', capacity: 160, rows: 10, cols: 14 },
      { id: 'rm009', cinemaId: 'ci003', name: 'Phòng 2 - 3D', type: '3D', capacity: 140, rows: 9, cols: 14 },
      { id: 'rm010', cinemaId: 'ci003', name: 'Phòng 3 - Ghế Đôi', type: '2D', capacity: 100, rows: 8, cols: 10 }
    ],

    users: [
      {
        id: 'u001', name: 'Admin CRTicket', email: 'admin@crticket.vn',
        phone: '0901234567', role: 'admin',
        password: 'admin123', avatar: null, createdAt: '2024-01-01', isActive: true
      },
      {
        id: 'u002', name: 'Nguyễn Văn Hùng', email: 'hung@example.com',
        phone: '0912345678', role: 'user',
        password: 'user123', avatar: null, createdAt: '2024-06-15', isActive: true
      },
      {
        id: 'u003', name: 'Trần Thị Lan', email: 'lan@example.com',
        phone: '0923456789', role: 'user',
        password: 'user123', avatar: null, createdAt: '2024-08-20', isActive: true
      }
    ],

    showtimes: [],
    bookings: [],
    tickets: []
  },

  // ========== SEED SHOWTIMES ==========
  // Dựng phần giao diện tương ứng trong khối _seedShowtimes.
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
    const prices = { 'IMAX': { normal: 80000, vip: 120000, couple: 180000 }, '4DX': { normal: 80000, vip: 120000, couple: 180000 }, 'Dolby': { normal: 80000, vip: 120000, couple: 180000 }, '2D': { normal: 80000, vip: 120000, couple: 180000 }, '3D': { normal: 80000, vip: 120000, couple: 180000 }, 'VIP': { normal: 80000, vip: 120000, couple: 180000 } };

    // Duyệt danh sách để dựng hoặc cập nhật từng phần tử giao diện.
    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const date = new Date(today);
      date.setDate(today.getDate() + dayOffset);
      const dateStr = Helpers.getDateString(date);

      movies.forEach(movieId => {
        roomSets.forEach(({ cinemaId, rooms }) => {
          rooms.slice(0, 2).forEach(roomId => {
            const room = this.mockData.rooms.find(r => r.id === roomId);
            // Dừng hoặc đổi hướng luồng khi dữ liệu bắt buộc chưa sẵn sàng.
            if (!room) return;
            const roomTimes = times.slice(0, 4);
            roomTimes.forEach(startTime => {
              const movieData = this.mockData.movies.find(m => m.id === movieId);
              // Dừng hoặc đổi hướng luồng khi dữ liệu bắt buộc chưa sẵn sàng.
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
  // Khởi tạo luồng init và chuẩn bị các phụ thuộc cần thiết.
  async init() {
    // Dừng hoặc đổi hướng luồng khi dữ liệu bắt buộc chưa sẵn sàng.
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

  // Cập nhật trạng thái hoặc dữ liệu trong khối syncBackendCatalog.
  async syncBackendCatalog() {
    // Bắt đầu thao tác có thể thất bại để hiển thị phản hồi phù hợp cho người dùng.
    try {
      const data = await this.getBackendMovies();
      const movies = (data.movies || []).map((movie) => this._mapBackendMovie(movie));
      // Xử lý riêng trường hợp danh sách rỗng hoặc có số lượng không hợp lệ.
      if (movies.length === 0) return;

      const showtimes = [];
      const cinemasById = new Map();
      const roomsById = new Map();

      // Duyệt danh sách để dựng hoặc cập nhật từng phần tử giao diện.
      for (const movie of movies) {
        const showtimeData = await this.getBackendMovieShowtimes(movie.id);
        (showtimeData.showtimes || []).forEach((showtime) => {
          showtimes.push(this._mapBackendShowtime(showtime));
          // Đánh giá điều kiện hiện tại để cập nhật giao diện và trạng thái đúng nhánh.
          if (showtime.cinema) cinemasById.set(showtime.cinema.id, this._mapBackendCinema(showtime.cinema));
          // Đánh giá điều kiện hiện tại để cập nhật giao diện và trạng thái đúng nhánh.
          if (showtime.room) roomsById.set(showtime.room.id, this._mapBackendRoom(showtime.room, showtime.cinema));
        });
      }

      // Bắt đầu thao tác có thể thất bại để hiển thị phản hồi phù hợp cho người dùng.
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
      // Xử lý riêng trường hợp danh sách rỗng hoặc có số lượng không hợp lệ.
      if (cinemasById.size > 0) this.mockData.cinemas = [...cinemasById.values()];
      // Xử lý riêng trường hợp danh sách rỗng hoặc có số lượng không hợp lệ.
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

  // Chuẩn hóa dữ liệu đầu vào/đầu ra trong khối _mapBackendMovie.
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
      status: movie.status || 'nowShowing',
      trailer: movie.trailer || '',
      ageRating: movie.ageRating || 'P',
      backend: true,
    };
  },

  // Dựng phần giao diện tương ứng trong khối _mapBackendShowtime.
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
      price: showtime.price || { normal: 0, vip: 0, couple: 0 },
      totalSeats: showtime.totalSeats || 0,
      bookedSeats: showtime.bookedSeats || 0,
      backend: true,
    };
  },

  // Chuẩn hóa dữ liệu đầu vào/đầu ra trong khối _mapBackendCinema.
  _mapBackendCinema(cinema) {
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
      imageUrl: cinema.imageUrl || '',
      facilities: ['2D'],
      image: cinema.imageUrl || `https://picsum.photos/seed/${cinema.id}/600/400`,
    };
  },

  // Chuẩn hóa dữ liệu đầu vào/đầu ra trong khối _mapBackendRoom.
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

  // Đọc và lọc dữ liệu cần thiết trong khối getBackendUserId.
  getBackendUserId() {
    const user = State && State.get ? State.get('currentUser') : null;
    // Kiểm tra trạng thái đăng nhập hoặc vai trò trước khi cho phép thao tác.
    if (!user || !user.backendUserId) {
      throw new Error('Tài khoản hiện tại chưa liên kết database. Vui lòng đăng xuất và đăng nhập lại.');
    }
    return user.backendUserId;
  },

  // Đọc và lọc dữ liệu cần thiết trong khối getSeatHoldSessionId.
  getSeatHoldSessionId() {
    let sessionId = localStorage.getItem('cineticket_hold_session_id');
    // Dừng hoặc đổi hướng luồng khi dữ liệu bắt buộc chưa sẵn sàng.
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      localStorage.setItem('cineticket_hold_session_id', sessionId);
    }
    return sessionId;
  },

  // Thực hiện trách nhiệm riêng của khối backendRequest.
  async backendRequest(path, options = {}) {
    const response = await fetch(`${this.backendBaseUrl}${path}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      },
      ...options
    });
    const text = await response.text();
    const payload = text ? JSON.parse(text) : null;
    // Kiểm tra kết quả từ backend và chuyển sang nhánh báo lỗi khi cần.
    if (!response.ok) {
      const message = payload && payload.message
        ? Array.isArray(payload.message) ? payload.message.join(', ') : payload.message
        : 'Backend request failed';
      throw new Error(message);
    }
    return payload;
  },

  // Dựng phần giao diện tương ứng trong khối getShowtimeSeats.
  getShowtimeSeats(showtimeId) {
    const params = new URLSearchParams({
      sessionId: this.getSeatHoldSessionId(),
    });
    const user = State && State.get ? State.get('currentUser') : null;
    // Kiểm tra trạng thái đăng nhập hoặc vai trò trước khi cho phép thao tác.
    if (user && user.backendUserId) params.set('userId', user.backendUserId);
    return this.backendRequest(`/showtimes/${showtimeId}/seats?${params.toString()}`);
  },

  // Áp dụng quy tắc ghế và quyền sở hữu giữ ghế trong khối holdSeat.
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

  // Xử lý việc gỡ bỏ, hủy hoặc giải phóng dữ liệu trong khối releaseSeat.
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

  // Thực hiện trách nhiệm riêng của khối login.
  login(data) {
    return this.backendRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  // Kiểm tra điều kiện nghiệp vụ trong khối register trước khi tiếp tục.
  register(data) {
    return this.backendRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  // Đọc và lọc dữ liệu cần thiết trong khối getBackendMovies.
  getBackendMovies() {
    return this.backendRequest('/movies');
  },

  // Đọc và lọc dữ liệu cần thiết trong khối getBackendMovie.
  getBackendMovie(movieId) {
    return this.backendRequest(`/movies/${movieId}`);
  },

  // Dựng phần giao diện tương ứng trong khối getBackendMovieShowtimes.
  getBackendMovieShowtimes(movieId) {
    return this.backendRequest(`/movies/${movieId}/showtimes`);
  },

  // Đọc và lọc dữ liệu cần thiết trong khối getMovieReviews.
  getMovieReviews(movieId, userId) {
    const params = new URLSearchParams();
    // Kiểm tra trạng thái đăng nhập hoặc vai trò trước khi cho phép thao tác.
    if (userId) params.set('userId', userId);
    const query = params.toString();
    return this.backendRequest(`/movies/${movieId}/reviews${query ? `?${query}` : ''}`);
  },

  // Tạo dữ liệu mới trong khối createMovieReview và trả về kết quả đã chuẩn hóa.
  createMovieReview(movieId, data) {
    return this.backendRequest(`/movies/${movieId}/reviews`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  // Tạo dữ liệu mới trong khối createBooking và trả về kết quả đã chuẩn hóa.
  createBooking(data) {
    return this.backendRequest('/bookings', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  // Đọc và lọc dữ liệu cần thiết trong khối getPaymentMethods.
  getPaymentMethods() {
    return this.backendRequest('/bookings/payment-methods');
  },

  // Thực hiện bước thanh toán trong khối payBooking với kiểm tra trạng thái an toàn.
  payBooking(bookingId) {
    return this.backendRequest(`/bookings/${bookingId}/pay`, {
      method: 'POST'
    });
  },

  // Tạo dữ liệu mới trong khối createVnpayPayment và trả về kết quả đã chuẩn hóa.
  createVnpayPayment(bookingId) {
    return this.backendRequest(`/bookings/${bookingId}/vnpay`, {
      method: 'POST'
    });
  },

  // Tạo dữ liệu mới trong khối createSepayPayment và trả về kết quả đã chuẩn hóa.
  createSepayPayment(bookingId) {
    return this.backendRequest(`/bookings/${bookingId}/sepay`, { method: 'POST' });
  },

  // Thực hiện bước thanh toán trong khối onlineDemoPay với kiểm tra trạng thái an toàn.
  onlineDemoPay(bookingId, provider) {
    return this.backendRequest(`/bookings/${bookingId}/online-demo-pay`, {
      method: 'POST',
      body: JSON.stringify({ provider })
    });
  },

  // Đọc và lọc dữ liệu cần thiết trong khối getConcessionCombos.
  getConcessionCombos() {
    return this.backendRequest('/concession-combos');
  },

  // Cập nhật trạng thái hoặc dữ liệu trong khối updateBookingCombos.
  updateBookingCombos(bookingId, items) {
    return this.backendRequest(`/bookings/${bookingId}/combos`, {
      method: 'PATCH',
      body: JSON.stringify({ items })
    });
  },

  // Kiểm tra điều kiện nghiệp vụ trong khối cancelBooking trước khi tiếp tục.
  cancelBooking(bookingId) {
    return this.backendRequest(`/bookings/${bookingId}`, {
      method: 'DELETE'
    });
  },

  // Xử lý việc gỡ bỏ, hủy hoặc giải phóng dữ liệu trong khối expireBookings.
  expireBookings() {
    return this.backendRequest('/bookings/expire', {
      method: 'POST'
    });
  },

  // Đọc và lọc dữ liệu cần thiết trong khối getAdminBookings.
  getAdminBookings() {
    return this.backendRequest('/bookings');
  },

  // Đọc và lọc dữ liệu cần thiết trong khối getAdminBookingDetail.
  getAdminBookingDetail(bookingId) {
    return this.backendRequest(`/bookings/${bookingId}`);
  },

  // Đọc và lọc dữ liệu cần thiết trong khối getAdminDashboard.
  getAdminDashboard() {
    return this.backendRequest('/admin/dashboard');
  },

  // Đọc và lọc dữ liệu cần thiết trong khối getAdminCinemas.
  getAdminCinemas() {
    return this.backendRequest('/admin/cinemas');
  },

  // Cập nhật trạng thái hoặc dữ liệu trong khối updateAdminCinema.
  updateAdminCinema(id, data) {
    return this.backendRequest(`/admin/cinemas/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  },

  // Đọc và lọc dữ liệu cần thiết trong khối getAdminRooms.
  getAdminRooms() {
    return this.backendRequest('/admin/rooms');
  },

  // Cập nhật trạng thái hoặc dữ liệu trong khối updateAdminRoom.
  updateAdminRoom(id, data) {
    return this.backendRequest(`/admin/rooms/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  },

  // Dựng phần giao diện tương ứng trong khối getAdminShowtimes.
  getAdminShowtimes() {
    return this.backendRequest('/admin/showtimes');
  },

  // Đọc và lọc dữ liệu cần thiết trong khối getAdminRoomAvailableSlots.
  getAdminRoomAvailableSlots(roomId, movieId, date) {
    const params = new URLSearchParams({ movieId, date });
    return this.backendRequest(`/admin/rooms/${roomId}/available-slots?${params.toString()}`);
  },

  // Đọc và lọc dữ liệu cần thiết trong khối getCinemaTicketPrices.
  getCinemaTicketPrices(cinemaId) {
    return this.backendRequest(`/admin/cinemas/${cinemaId}/ticket-prices`);
  },

  // Cập nhật trạng thái hoặc dữ liệu trong khối upsertCinemaTicketPrice.
  upsertCinemaTicketPrice(cinemaId, data) {
    return this.backendRequest(`/admin/cinemas/${cinemaId}/ticket-prices`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  // Đọc và lọc dữ liệu cần thiết trong khối getAdminConcessionCombos.
  getAdminConcessionCombos() {
    return this.backendRequest('/admin/concession-combos');
  },

  // Tạo dữ liệu mới trong khối createAdminConcessionCombo và trả về kết quả đã chuẩn hóa.
  createAdminConcessionCombo(data) {
    return this.backendRequest('/admin/concession-combos', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  // Cập nhật trạng thái hoặc dữ liệu trong khối updateAdminConcessionCombo.
  updateAdminConcessionCombo(id, data) {
    return this.backendRequest(`/admin/concession-combos/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  },

  // Xử lý việc gỡ bỏ, hủy hoặc giải phóng dữ liệu trong khối deleteAdminConcessionCombo.
  deleteAdminConcessionCombo(id) {
    return this.backendRequest(`/admin/concession-combos/${id}`, {
      method: 'DELETE'
    });
  },

  // Tạo dữ liệu mới trong khối createAdminShowtime và trả về kết quả đã chuẩn hóa.
  createAdminShowtime(data) {
    return this.backendRequest('/admin/showtimes', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  // Tạo dữ liệu mới trong khối createAdminMovieFromTmdb và trả về kết quả đã chuẩn hóa.
  createAdminMovieFromTmdb(tmdbId, status = 'NOW_SHOWING') {
    return this.backendRequest('/admin/movies/tmdb', {
      method: 'POST',
      body: JSON.stringify({ tmdbId, status })
    });
  },

  // Cập nhật trạng thái hoặc dữ liệu trong khối updateAdminMovie.
  updateAdminMovie(id, data) {
    return this.backendRequest(`/admin/movies/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  },

  // Xử lý việc gỡ bỏ, hủy hoặc giải phóng dữ liệu trong khối deleteAdminMovie.
  deleteAdminMovie(movieId) {
    return this.backendRequest(`/admin/movies/${movieId}`, {
      method: 'DELETE'
    });
  },

  // Thực hiện trách nhiệm riêng của khối importUpcomingMoviesFromTmdb.
  importUpcomingMoviesFromTmdb({ page = 1, limit = 10 } = {}) {
    return this.backendRequest('/admin/movies/tmdb/upcoming', {
      method: 'POST',
      body: JSON.stringify({ page, limit })
    });
  },

  // Đọc và lọc dữ liệu cần thiết trong khối getBookingTickets.
  getBookingTickets(bookingId) {
    return this.backendRequest(`/bookings/${bookingId}/tickets`);
  },

  // Đọc và lọc dữ liệu cần thiết trong khối getBookingByQr.
  getBookingByQr(bookingQrToken) {
    return this.backendRequest(`/bookings/qr/${encodeURIComponent(bookingQrToken)}`);
  },

  // Kiểm tra điều kiện nghiệp vụ trong khối checkInBookingByQr trước khi tiếp tục.
  checkInBookingByQr(bookingQrToken, data = {}) {
    return this.backendRequest(`/bookings/qr/${encodeURIComponent(bookingQrToken)}/check-in`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  // Đọc và lọc dữ liệu cần thiết trong khối getTicketByQr.
  getTicketByQr(qrToken) {
    return this.backendRequest(`/tickets/qr/${encodeURIComponent(qrToken)}`);
  },

  // Kiểm tra điều kiện nghiệp vụ trong khối checkInTicket trước khi tiếp tục.
  checkInTicket(qrToken, data = {}) {
    return this.backendRequest(`/tickets/qr/${encodeURIComponent(qrToken)}/check-in`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  // Đọc và lọc dữ liệu cần thiết trong khối getUserTickets.
  getUserTickets(userId) {
    return this.backendRequest(`/users/${userId}/tickets`);
  },

  // Đọc và lọc dữ liệu cần thiết trong khối getUserBookings.
  getUserBookings(userId) {
    return this.backendRequest(`/users/${encodeURIComponent(userId)}/bookings`);
  },

  // Cập nhật trạng thái hoặc dữ liệu trong khối _save.
  _save(key) {
    localStorage.setItem('cineticket_' + key, JSON.stringify(this.mockData[key]));
  },

  // ========== HTTP-LIKE METHODS (MOCK) ==========
  // Đọc và lọc dữ liệu cần thiết trong khối get.
  async get(endpoint) {
    await this._delay();
    const parts = endpoint.replace('/api/', '').split('/');
    const resource = parts[0];
    const id = parts[1];
    // Đánh giá điều kiện hiện tại để cập nhật giao diện và trạng thái đúng nhánh.
    if (id) {
      const item = (this.mockData[resource] || []).find(i => i.id === id);
      return item ? { data: item } : { error: 'Not found', status: 404 };
    }
    return { data: this.mockData[resource] || [] };
  },

  // Thực hiện trách nhiệm riêng của khối post.
  async post(endpoint, data) {
    await this._delay();
    const resource = endpoint.replace('/api/', '').split('/')[0];
    const newItem = { ...data, id: data.id || Helpers.generateId(), createdAt: new Date().toISOString() };
    // Dừng hoặc đổi hướng luồng khi dữ liệu bắt buộc chưa sẵn sàng.
    if (!this.mockData[resource]) this.mockData[resource] = [];
    this.mockData[resource].push(newItem);
    this._save(resource);
    return { data: newItem };
  },

  // Thực hiện trách nhiệm riêng của khối put.
  async put(endpoint, data) {
    await this._delay();
    const parts = endpoint.replace('/api/', '').split('/');
    const resource = parts[0];
    const id = parts[1];
    const idx = (this.mockData[resource] || []).findIndex(i => i.id === id);
    // Kiểm tra kết quả từ backend và chuyển sang nhánh báo lỗi khi cần.
    if (idx === -1) return { error: 'Not found', status: 404 };
    this.mockData[resource][idx] = { ...this.mockData[resource][idx], ...data };
    this._save(resource);
    return { data: this.mockData[resource][idx] };
  },

  // Xử lý việc gỡ bỏ, hủy hoặc giải phóng dữ liệu trong khối delete.
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

  // Thực hiện trách nhiệm riêng của khối _delay.
  _delay(ms = 50) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
};
