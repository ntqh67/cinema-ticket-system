/**
 * Client TMDB dùng chung cho các script nhập và đồng bộ phim.
 * Thông tin xác thực được đọc sau khi dotenv đã nạp biến môi trường.
 */

const TMDB_API_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE_URL =
  process.env.TMDB_IMAGE_BASE_URL || 'https://image.tmdb.org/t/p';

// Đọc thông tin xác thực tại thời điểm gọi để không phụ thuộc thứ tự nạp module.
function credentials() {
  return {
    apiKey: process.env.TMDB_API_KEY,
    readAccessToken: process.env.TMDB_READ_ACCESS_TOKEN,
  };
}

// Bảo đảm script có ít nhất một loại thông tin xác thực TMDB.
function requireCredential() {
  const { apiKey, readAccessToken } = credentials();
  if (!apiKey && !readAccessToken) {
    throw new Error(
      'Missing TMDB_API_KEY or TMDB_READ_ACCESS_TOKEN in .env',
    );
  }
}

// Tạo URL TMDB và chỉ thêm API key khi không sử dụng Bearer token.
function buildUrl(path, params = {}) {
  const { apiKey, readAccessToken } = credentials();
  const url = new URL(`${TMDB_API_URL}${path}`);

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  });

  if (!readAccessToken && apiKey) {
    url.searchParams.set('api_key', apiKey);
  }

  return url;
}

// Gọi TMDB bằng cơ chế xác thực đã cấu hình và chuẩn hóa lỗi HTTP.
async function tmdbFetch(path, params) {
  const { readAccessToken } = credentials();
  const response = await fetch(buildUrl(path, params), {
    headers: readAccessToken
      ? {
          Authorization: `Bearer ${readAccessToken}`,
          Accept: 'application/json',
        }
      : {
          Accept: 'application/json',
        },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `TMDB ${response.status} ${response.statusText}: ${body}`,
    );
  }

  return response.json();
}

// Ghép đường dẫn ảnh TMDB theo kích thước yêu cầu.
function imageUrl(path, size) {
  return path ? `${IMAGE_BASE_URL}/${size}${path}` : null;
}

// Chọn trailer YouTube tốt nhất, ưu tiên trailer chính thức rồi đến teaser.
function pickTrailer(videos) {
  const youtubeVideos = videos.filter(
    (video) => video.site === 'YouTube' && video.key,
  );
  const officialTrailer = youtubeVideos.find(
    (video) => video.type === 'Trailer' && video.official,
  );
  const trailer = youtubeVideos.find((video) => video.type === 'Trailer');
  const teaser = youtubeVideos.find((video) => video.type === 'Teaser');
  const selected = officialTrailer || trailer || teaser || youtubeVideos[0];

  return selected
    ? `https://www.youtube.com/embed/${selected.key}`
    : null;
}

// Tìm trailer tiếng Việt trước, sau đó dùng bản tiếng Anh nếu cần.
async function fetchTrailer(tmdbId) {
  const languages = ['vi-VN', 'en-US'];

  for (const language of languages) {
    const videos = await tmdbFetch(`/movie/${tmdbId}/videos`, { language });
    const trailerUrl = pickTrailer(videos.results || []);
    if (trailerUrl) {
      return trailerUrl;
    }
  }

  return null;
}

module.exports = {
  requireCredential,
  buildUrl,
  tmdbFetch,
  imageUrl,
  pickTrailer,
  fetchTrailer,
};
