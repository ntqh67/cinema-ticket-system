/**
 * Mục đích: Mã nguồn phục vụ khởi tạo và tiện ích dùng chung; các khối bên dưới được giữ tách biệt theo trách nhiệm.
 */
import genreNameMap from './genre-map.json';

// Công bố bản đồ dưới kiểu dữ liệu ổn định để các service TypeScript dùng lại.
export const TMDB_GENRE_MAP: Record<string, string> = genreNameMap;

export function normalizeGenreName(name: string | null | undefined) {
  const value = String(name || '').trim();
  return TMDB_GENRE_MAP[value] || value;
}
