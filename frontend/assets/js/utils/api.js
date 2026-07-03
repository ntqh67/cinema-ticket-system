/* CineTicket - API Layer with Mock Data */
const API = {
  baseUrl: '/api',

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
        trailer: 'https://www.youtube.com/embed/dQw4w9WgXcQ', ageRating: 'P'
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
        trailer: 'https://www.youtube.com/embed/dQw4w9WgXcQ', ageRating: 'C13'
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
        trailer: 'https://www.youtube.com/embed/dQw4w9WgXcQ', ageRating: 'P'
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
        trailer: 'https://www.youtube.com/embed/dQw4w9WgXcQ', ageRating: 'C13'
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
        trailer: 'https://www.youtube.com/embed/dQw4w9WgXcQ', ageRating: 'C13'
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
        trailer: 'https://www.youtube.com/embed/dQw4w9WgXcQ', ageRating: 'P'
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
        trailer: 'https://www.youtube.com/embed/dQw4w9WgXcQ', ageRating: 'C16'
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
        trailer: 'https://www.youtube.com/embed/dQw4w9WgXcQ', ageRating: 'C13'
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
        id: 'u001', name: 'Admin CineTicket', email: 'admin@cineticket.vn',
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
    tickets: [],

    promotions: [
      {
        id: 'promo001', code: 'SUMMER25', title: 'Ưu Đãi Mùa Hè 2025',
        description: 'Giảm 25% cho tất cả các suất chiếu trong tháng 6. Áp dụng cho đơn hàng từ 100.000₫.',
        discount: 0.25, discountType: 'percent', maxDiscount: 50000, minOrder: 100000,
        startDate: '2025-06-01', endDate: '2025-06-30',
        usageLimit: 1000, usedCount: 342, isActive: true,
        color: 'linear-gradient(135deg, #e50914, #ff6b35)',
        image: 'https://picsum.photos/seed/summer25/600/300'
      },
      {
        id: 'promo002', code: 'NEWUSER', title: 'Chào Khách Hàng Mới',
        description: 'Giảm 50.000₫ cho lần đặt vé đầu tiên. Không giới hạn đơn hàng tối thiểu.',
        discount: 50000, discountType: 'fixed', maxDiscount: 50000, minOrder: 0,
        startDate: '2025-01-01', endDate: '2025-12-31',
        usageLimit: 500, usedCount: 128, isActive: true,
        color: 'linear-gradient(135deg, #0068ff, #00d2ff)',
        image: 'https://picsum.photos/seed/newuser/600/300'
      },
      {
        id: 'promo003', code: 'WEEKEND30', title: 'Cuối Tuần Vui Vẻ',
        description: 'Giảm 30.000₫ cho các suất chiếu vào thứ 7, CN. Áp dụng từ 2 vé trở lên.',
        discount: 30000, discountType: 'fixed', maxDiscount: 30000, minOrder: 150000,
        startDate: '2025-05-01', endDate: '2025-08-31',
        usageLimit: 2000, usedCount: 567, isActive: true,
        color: 'linear-gradient(135deg, #7c3aed, #db2777)',
        image: 'https://picsum.photos/seed/weekend30/600/300'
      }
    ]
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
    const prices = { 'IMAX': { normal: 170000, vip: 220000, couple: 400000 }, '4DX': { normal: 160000, vip: 200000, couple: 380000 }, 'Dolby': { normal: 155000, vip: 195000, couple: 360000 }, '2D': { normal: 90000, vip: 130000, couple: 240000 }, '3D': { normal: 110000, vip: 150000, couple: 280000 }, 'VIP': { normal: 150000, vip: 190000, couple: 350000 } };

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
  init() {
    if (!localStorage.getItem('cineticket_seeded')) {
      this.mockData.showtimes = this._seedShowtimes();
      localStorage.setItem('cineticket_movies', JSON.stringify(this.mockData.movies));
      localStorage.setItem('cineticket_cinemas', JSON.stringify(this.mockData.cinemas));
      localStorage.setItem('cineticket_rooms', JSON.stringify(this.mockData.rooms));
      localStorage.setItem('cineticket_users', JSON.stringify(this.mockData.users));
      localStorage.setItem('cineticket_showtimes', JSON.stringify(this.mockData.showtimes));
      localStorage.setItem('cineticket_bookings', JSON.stringify([]));
      localStorage.setItem('cineticket_tickets', JSON.stringify([]));
      localStorage.setItem('cineticket_promotions', JSON.stringify(this.mockData.promotions));
      localStorage.setItem('cineticket_seeded', '1');
    } else {
      this.mockData.movies = JSON.parse(localStorage.getItem('cineticket_movies') || '[]');
      this.mockData.cinemas = JSON.parse(localStorage.getItem('cineticket_cinemas') || '[]');
      this.mockData.rooms = JSON.parse(localStorage.getItem('cineticket_rooms') || '[]');
      this.mockData.users = JSON.parse(localStorage.getItem('cineticket_users') || '[]');
      this.mockData.showtimes = JSON.parse(localStorage.getItem('cineticket_showtimes') || '[]');
      this.mockData.bookings = JSON.parse(localStorage.getItem('cineticket_bookings') || '[]');
      this.mockData.tickets = JSON.parse(localStorage.getItem('cineticket_tickets') || '[]');
      this.mockData.promotions = JSON.parse(localStorage.getItem('cineticket_promotions') || '[]');
    }
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
