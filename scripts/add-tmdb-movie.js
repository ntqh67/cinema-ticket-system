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

function parseMovieIds() {
  const ids = process.argv.slice(2).map((value) => Number(value));

  if (!ids.length || ids.some((id) => !Number.isInteger(id) || id <= 0)) {
    throw new Error('Usage: npm.cmd run tmdb:add -- 123456 [anotherTmdbId]');
  }

  return ids;
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

function imageUrl(path, size) {
  return path ? `${IMAGE_BASE_URL}/${size}${path}` : null;
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

async function replaceMovieGenres(movieId, genres) {
  await prisma.movieGenre.deleteMany({ where: { movieId } });

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

async function main() {
  requireCredential();

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
