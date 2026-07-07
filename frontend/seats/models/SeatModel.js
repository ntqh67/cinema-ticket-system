/* CineTicket - Seat Model */
const SeatModel = {
  async getByShowtime(showtimeId) {
    const data = await API.getShowtimeSeats(showtimeId);
    const rowsByLabel = {};

    data.seats.forEach((item) => {
      if (!rowsByLabel[item.row]) rowsByLabel[item.row] = [];
      const seatId = `${item.row}${item.number}`;
      rowsByLabel[item.row].push({
        id: seatId,
        label: seatId,
        showtimeSeatId: item.showtimeSeatId,
        row: item.row,
        col: item.number,
        type: this._mapSeatType(item.type),
        price: Number(item.price),
        status: item.status,
        heldByMe: !!item.heldByMe,
        isBooked: item.status !== 'AVAILABLE' && !item.heldByMe,
      });
    });

    const rows = Object.keys(rowsByLabel).sort().map((label) => ({
      label,
      seats: rowsByLabel[label].sort((a, b) => a.col - b.col),
    }));

    if (rows.length === 0) {
      throw new Error('Suat chieu chua co so do ghe');
    }

    const showtime = this._mapShowtime(data.showtime);
    showtime.price = {
      ...showtime.price,
      ...this._getPriceByType(rows),
    };

    return {
      showtime,
      room: this._mapRoom(data.showtime.room, rows),
      rows,
    };
  },

  _mapSeatType(type) {
    if (type === 'VIP') return 'vip';
    if (type === 'COUPLE') return 'couple';
    return 'normal';
  },

  _mapShowtime(showtime) {
    const start = new Date(showtime.startAt);
    const end = new Date(showtime.endAt);
    return {
      id: showtime.id,
      movieId: showtime.movie ? showtime.movie.id : '',
      cinemaId: showtime.room && showtime.room.cinema ? showtime.room.cinema.id : '',
      roomId: showtime.room ? showtime.room.id : '',
      date: Helpers.getDateString(start),
      startTime: start.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      endTime: end.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      price: {
        normal: Number(showtime.basePrice || 80000),
        vip: 120000,
        couple: 180000,
      },
      backend: true,
    };
  },

  _mapRoom(room, rows) {
    return {
      id: room.id,
      cinemaId: room.cinema ? room.cinema.id : '',
      name: room.name,
      type: '2D',
      rows: rows.length,
      cols: Math.max(...rows.map((row) => row.seats.length), 0),
    };
  },

  _getPriceByType(rows) {
    const prices = {};
    rows.forEach((row) => {
      row.seats.forEach((seat) => {
        if (prices[seat.type] === undefined && Number.isFinite(seat.price)) {
          prices[seat.type] = seat.price;
        }
      });
    });
    return prices;
  },

  generateSeats(room, bookedSeats = []) {
    const rows = [];
    const rowLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const vipZone = this._getVipZoneForRoom(room);

    for (let r = 0; r < room.rows; r++) {
      const rowLabel = rowLetters[r];
      const cols = [];
      const isCoupleRow = r === room.rows - 1;
      for (let c = 0; c < room.cols; c++) {
        const seatId = `${rowLabel}${c + 1}`;
        let type = 'normal';
        if (isCoupleRow && c % 2 === 0 && c < room.cols - 1) type = 'couple';
        else if (isCoupleRow && c % 2 !== 0) continue;
        else if (vipZone.rows.has(rowLabel) && c + 1 >= vipZone.colStart && c + 1 <= vipZone.colEnd) type = 'vip';
        cols.push({
          id: seatId,
          row: rowLabel,
          col: c + 1,
          type,
          isBooked: bookedSeats.includes(seatId),
        });
      }
      rows.push({ label: rowLabel, seats: cols });
    }
    return rows;
  },

  _getVipZoneForRoom(room) {
    const rowLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const zoneRowCount = Math.min(3, room.rows);
    const zoneColCount = Math.min(5, room.cols);
    const zoneRowStart = Math.max(0, Math.round((room.rows - zoneRowCount) / 2));
    const zoneColStart = Math.max(1, Math.round((room.cols - zoneColCount) / 2) + 1);
    return {
      rows: new Set(rowLetters.slice(zoneRowStart, zoneRowStart + zoneRowCount).split('')),
      colStart: zoneColStart,
      colEnd: zoneColStart + zoneColCount - 1,
    };
  },

  getPriceForType(showtime, seatType) {
    if (!showtime || !showtime.price) return 80000;
    if (seatType === 'vip') return showtime.price.vip || 120000;
    if (seatType === 'couple') return showtime.price.couple || 180000;
    return showtime.price.normal || 80000;
  },
};
