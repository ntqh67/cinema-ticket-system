const { PrismaClient } = require('@prisma/client');
const dotenv = require('dotenv');
const { normalizeGenreName } = require('./genre-map');

dotenv.config();

const prisma = new PrismaClient();

const TMDB_API_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE_URL = process.env.TMDB_IMAGE_BASE_URL || 'https://image.tmdb.org/t/p';
const apiKey = process.env.TMDB_API_KEY;
const readAccessToken = process.env.TMDB_READ_ACCESS_TOKEN;

function requireCredential() {
  if (!apiKey && !readAccessToken) {
    throw new Error('Missing TMDB_API_KEY or TMDB_READ_ACCESS_TOKEN in .env');
  }
}

function buildUrl(path, params = {}) {
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

async function tmdbFetch(path, params) {
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
    throw new Error(`TMDB ${response.status} ${response.statusText}: ${body}`);
  }

  return response.json();
}

function releaseYear(movie) {
  if (!movie.releaseDate) {
    return undefined;
  }

  return new Date(movie.releaseDate).getFullYear();
}

function pickMovieResult(results, movie) {
  if (!results.length) {
    return null;
  }

  const year = releaseYear(movie);

  if (year) {
    const exactYear = results.find((result) => {
      if (!result.release_date) {
        return false;
      }

      return Number(result.release_date.slice(0, 4)) === year;
    });

    if (exactYear) {
      return exactYear;
    }
  }

  const exactTitle = results.find(
    (result) => result.title && result.title.toLowerCase() === movie.title.toLowerCase(),
  );

  return exactTitle || results[0];
}

function imageUrl(path, size) {
  if (!path) {
    return null;
  }

  return `${IMAGE_BASE_URL}/${size}${path}`;
}

function pickTrailer(videos) {
  const youtubeVideos = videos.filter((video) => video.site === 'YouTube' && video.key);
  const officialTrailer = youtubeVideos.find(
    (video) => video.type === 'Trailer' && video.official,
  );
  const trailer = youtubeVideos.find((video) => video.type === 'Trailer');
  const teaser = youtubeVideos.find((video) => video.type === 'Teaser');
  const selected = officialTrailer || trailer || teaser || youtubeVideos[0];

  return selected ? `https://www.youtube.com/embed/${selected.key}` : null;
}

async function findTmdbMovie(movie) {
  if (movie.tmdbId) {
    return tmdbFetch(`/movie/${movie.tmdbId}`, { language: 'en-US' });
  }

  const languages = ['vi-VN', 'en-US'];

  for (const language of languages) {
    const search = await tmdbFetch('/search/movie', {
      query: movie.title,
      language,
      include_adult: false,
      page: 1,
      year: releaseYear(movie),
    });
    const result = pickMovieResult(search.results || [], movie);

    if (result) {
      return result;
    }
  }

  return null;
}

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

async function syncMovie(movie) {
  const tmdbMovie = await findTmdbMovie(movie);

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

    if (details.genres?.length) {
      await tx.movieGenre.deleteMany({ where: { movieId: movie.id } });
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

async function main() {
  requireCredential();

  const movies = await prisma.movie.findMany({
    orderBy: { title: 'asc' },
  });

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
