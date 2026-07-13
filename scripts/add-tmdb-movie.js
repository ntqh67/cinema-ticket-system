/**
 * Mục đích: Script đồng bộ dữ liệu phim và hình ảnh từ TMDB vào PostgreSQL.
 */
const { PrismaClient } = require('@prisma/client');
const dotenv = require('dotenv');
const { normalizeGenreName } = require('./genre-map');

dotenv.config();

const prisma = new PrismaClient();
const {
  requireCredential,
  tmdbFetch,
  imageUrl,
  fetchTrailer,
} = require('./tmdb-client');

// Chuẩn hóa dữ liệu đầu vào/đầu ra trong khối parseMovieIds.
function parseMovieIds() {
  const ids = process.argv.slice(2).map((value) => Number(value));

  // Kiểm tra số lượng phần tử để xử lý trường hợp rỗng hoặc vượt giới hạn.
  if (!ids.length || ids.some((id) => !Number.isInteger(id) || id <= 0)) {
    throw new Error('Usage: npm.cmd run tmdb:add -- 123456 [anotherTmdbId]');
  }

  return ids;
}

// Cập nhật trạng thái hoặc dữ liệu trong khối replaceMovieGenres.
async function replaceMovieGenres(movieId, genres) {
  await prisma.movieGenre.deleteMany({ where: { movieId } });

  // Duyệt tập dữ liệu để xử lý từng phần tử theo cùng một quy tắc.
  for (const genre of genres) {
    const name = normalizeGenreName(genre.name);
    const genreRecord = await prisma.genre.upsert({
      where: { name },
      update: {},
      create: { name },
    });

    await prisma.movieGenre.create({
      data: {
        movieId,
        genreId: genreRecord.id,
      },
    });
  }
}

// Tạo dữ liệu mới trong khối addOrUpdateMovie và trả về kết quả đã chuẩn hóa.
async function addOrUpdateMovie(tmdbId) {
  const detailsVi = await tmdbFetch(`/movie/${tmdbId}`, { language: 'vi-VN' });
  const detailsEn =
    detailsVi.title && detailsVi.runtime
      ? detailsVi
      : await tmdbFetch(`/movie/${tmdbId}`, { language: 'en-US' });
  const details = {
    ...detailsEn,
    ...Object.fromEntries(
      Object.entries(detailsVi).filter(([, value]) => value !== null && value !== ''),
    ),
  };
  const trailerUrl = await fetchTrailer(tmdbId);
  const existingMovie = await prisma.movie.findFirst({ where: { tmdbId } });
  const posterPath = details.poster_path || detailsEn.poster_path;
  const data = {
    tmdbId,
    title: details.title || detailsEn.title,
    description: details.overview || detailsEn.overview || null,
    durationMin: details.runtime || detailsEn.runtime || 100,
    releaseDate: details.release_date ? new Date(`${details.release_date}T00:00:00.000Z`) : null,
    posterUrl: imageUrl(posterPath, 'w500'),
    trailerUrl,
    status: 'NOW_SHOWING',
  };

  const movie = existingMovie
    ? await prisma.movie.update({ where: { id: existingMovie.id }, data })
    : await prisma.movie.create({ data });

  await replaceMovieGenres(movie.id, details.genres || detailsEn.genres || []);

  console.log(
    `${existingMovie ? 'UPDATED' : 'ADDED'} ${movie.title}: tmdb=${tmdbId}, poster=${
      data.posterUrl ? 'yes' : 'no'
    }, trailer=${trailerUrl ? 'yes' : 'no'}`,
  );
}

// Khởi tạo luồng main và chuẩn bị các phụ thuộc cần thiết.
async function main() {
  // Kiểm tra điều kiện nghiệp vụ trong khối requireCredential trước khi tiếp tục.
  requireCredential();

  // Duyệt tập dữ liệu để xử lý từng phần tử theo cùng một quy tắc.
  for (const tmdbId of parseMovieIds()) {
    await addOrUpdateMovie(tmdbId);
  }
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
