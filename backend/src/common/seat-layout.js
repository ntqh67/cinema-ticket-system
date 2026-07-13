/**
 * Các phép tính thuần dùng chung cho runtime backend và script seed.
 * File JavaScript được giữ độc lập để Prisma seed có thể require trực tiếp.
 */

// Tính vùng VIP nằm giữa sơ đồ, tối đa ba hàng và năm cột.
function getVipZone(rows, columns) {
  const zoneRowCount = Math.min(3, rows.length);
  const zoneColCount = Math.min(5, columns);
  const rowStart = Math.max(
    0,
    Math.round((rows.length - zoneRowCount) / 2),
  );
  const colStart = Math.max(
    1,
    Math.round((columns - zoneColCount) / 2) + 1,
  );

  return {
    rows: new Set(rows.slice(rowStart, rowStart + zoneRowCount)),
    colStart,
    colEnd: colStart + zoneColCount - 1,
  };
}

// Tạo thời điểm mới cách thời điểm đầu vào một số phút xác định.
function addMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

module.exports = {
  getVipZone,
  addMinutes,
};
