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

// Xử lý việc gỡ bỏ, hủy hoặc giải phóng dữ liệu trong khối releaseYear.
function releaseYear(movie) {
  // Chặn luồng hiện tại khi dữ liệu hoặc điều kiện bắt buộc chưa được đáp ứng.
  if (!movie.releaseDate) {
    return undefined;
  }

  return new Date(movie.releaseDate).getFullYear();
}

// Thực hiện trách nhiệm riêng của khối pickMovieResult.
function pickMovieResult(results, movie) {
  // Kiểm tra kết quả thao tác và chuyển sang nhánh lỗi khi cần.
  if (!results.length) {
    return null;
  }

  const year = releaseYear(movie);

  // Đánh giá điều kiện để chọn nhánh xử lý phù hợp và tránh cập nhật sai trạng thái.
  if (year) {
    const exactYear = results.find((result) => {
      // Kiểm tra kết quả thao tác và chuyển sang nhánh lỗi khi cần.
      if (!result.release_date) {
        return false;
      }

      return Number(result.release_date.slice(0, 4)) === year;
    });

    // Đánh giá điều kiện để chọn nhánh xử lý phù hợp và tránh cập nhật sai trạng thái.
    if (exactYear) {
      return exactYear;
    }
  }

  const exactTitle = results.find(
    (result) => result.title && result.title.toLowerCase() === movie.title.toLowerCase(),
  );

  return exactTitle || results[0];
}

// Đọc và lọc dữ liệu cần thiết trong khối findTmdbMovie.
async function findTmdbMovie(movie) {
  // Đánh giá điều kiện để chọn nhánh xử lý phù hợp và tránh cập nhật sai trạng thái.
  if (movie.tmdbId) {
    return tmdbFetch(`/movie/${movie.tmdbId}`, { language: 'en-US' });
  }

  const languages = ['vi-VN', 'en-US'];

  // Duyệt tập dữ liệu để xử lý từng phần tử theo cùng một quy tắc.
  for (const language of languages) {
    const search = await tmdbFetch('/search/movie', {
      query: movie.title,
      language,
      include_adult: false,
      page: 1,
      year: releaseYear(movie),
    });
    const result = pickMovieResult(search.results || [], movie);

    // Kiểm tra kết quả thao tác và chuyển sang nhánh lỗi khi cần.
    if (result) {
      return result;
    }
  }

  return null;
}

// Cập nhật trạng thái hoặc dữ liệu trong khối syncMovie.
async function syncMovie(movie) {
  const tmdbMovie = await findTmdbMovie(movie);

  // Chặn luồng hiện tại khi dữ liệu hoặc điều kiện bắt buộc chưa được đáp ứng.
  if (!tmdbMovie) {
    console.log(`SKIP ${movie.title}: TMDB match not found`);
    return;
  }

  const details = await tmdbFetch(`/movie/${tmdbMovie.id}`, { language: 'vi-VN' });
  const trailerUrl = await fetchTrailer(tmdbMovie.id);
  const posterUrl = imageUrl(details.poster_path || tmdbMovie.poster_path, 'w500');

  await prisma.$transaction(async (tx) => {
    await tx.movie.update({
      where: { id: movie.id },
      data: {
        description: movie.description || details.overview || undefined,
        tmdbId: tmdbMovie.id,
        posterUrl: posterUrl || movie.posterUrl,
        trailerUrl: trailerUrl || movie.trailerUrl,
        releaseDate:
          movie.releaseDate || details.release_date
            ? new Date(details.release_date || movie.releaseDate)
            : undefined,
      },
    });

    // Kiểm tra số lượng phần tử để xử lý trường hợp rỗng hoặc vượt giới hạn.
    if (details.genres?.length) {
      await tx.movieGenre.deleteMany({ where: { movieId: movie.id } });
      // Duyệt tập dữ liệu để xử lý từng phần tử theo cùng một quy tắc.
      for (const genre of details.genres) {
        const name = normalizeGenreName(genre.name);
        const genreRecord = await tx.genre.upsert({
          where: { name },
          update: {},
          create: { name },
        });
        await tx.movieGenre.create({
          data: {
            movieId: movie.id,
            genreId: genreRecord.id,
          },
        });
      }
    }
  });

  console.log(
    `SYNC ${movie.title}: tmdb=${tmdbMovie.id}, poster=${posterUrl ? 'yes' : 'no'}, trailer=${
      trailerUrl ? 'yes' : 'no'
    }, genres=${details.genres?.length || 0}`,
  );
}

// Khởi tạo luồng main và chuẩn bị các phụ thuộc cần thiết.
async function main() {
  // Kiểm tra điều kiện nghiệp vụ trong khối requireCredential trước khi tiếp tục.
  requireCredential();

  const movies = await prisma.movie.findMany({
    orderBy: { title: 'asc' },
  });

  // Duyệt tập dữ liệu để xử lý từng phần tử theo cùng một quy tắc.
  for (const movie of movies) {
    await syncMovie(movie);
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
