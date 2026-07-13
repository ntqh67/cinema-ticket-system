/**
 * Mục đích: Mã nguồn phục vụ khởi tạo và tiện ích dùng chung; các khối bên dưới được giữ tách biệt theo trách nhiệm.
 */
// Dùng chung dữ liệu chuẩn với backend để hai môi trường không lệch tên thể loại.
const GENRE_NAME_MAP = require('../backend/src/common/genre-map.json');

// Chuẩn hóa dữ liệu đầu vào/đầu ra trong khối normalizeGenreName.
function normalizeGenreName(name) {
  const value = String(name || '').trim();
  return GENRE_NAME_MAP[value] || value;
}

module.exports = {
  GENRE_NAME_MAP,
  normalizeGenreName,
};
