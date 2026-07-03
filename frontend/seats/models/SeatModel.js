/* CineTicket - Seat Model */
const SeatModel = {
  generateSeats(room, bookedSeats = []) {
    const rows = [];
    const rowLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    for (let r = 0; r < room.rows; r++) {
      const rowLabel = rowLetters[r];
      const cols = [];
      const isVipRow = r >= Math.floor(room.rows * 0.3) && r < Math.floor(room.rows * 0.7);
      const isCoupleRow = r === room.rows - 1;
      for (let c = 0; c < room.cols; c++) {
        const seatId = `${rowLabel}${c + 1}`;
        let type = 'normal';
        if (isCoupleRow && c % 2 === 0 && c < room.cols - 1) type = 'couple';
        else if (isCoupleRow && c % 2 !== 0) continue;
        else if (isVipRow) type = 'vip';
        cols.push({
          id: seatId, row: rowLabel, col: c + 1, type,
          isBooked: bookedSeats.includes(seatId)
        });
      }
      rows.push({ label: rowLabel, seats: cols });
    }
    return rows;
  },

  getBookedSeats(showtimeId) {
    const bookings = API.mockData.bookings.filter(b =>
      b.showtimeId === showtimeId && b.status !== 'cancelled'
    );
    const booked = [];
    bookings.forEach(b => { if (b.seats) booked.push(...b.seats); });
    return booked;
  },

  getPriceForType(showtime, seatType) {
    if (!showtime || !showtime.price) return 90000;
    if (seatType === 'vip') return showtime.price.vip || 130000;
    if (seatType === 'couple') return showtime.price.couple || 240000;
    return showtime.price.normal || 90000;
  }
};
