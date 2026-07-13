const { PrismaClient } = require('@prisma/client');
const dotenv = require('dotenv');
const { normalizeGenreName } = require('./genre-map');

dotenv.config();

const prisma = new PrismaClient();

async function mergeGenre(sourceGenre, targetName) {
  if (sourceGenre.name === targetName) {
    return { changed: false, from: sourceGenre.name, to: targetName };
  }

  const targetGenre = await prisma.genre.upsert({
    where: { name: targetName },
    update: {},
    create: { name: targetName },
  });

  const links = await prisma.movieGenre.findMany({
    where: { genreId: sourceGenre.id },
    select: { movieId: true },
  });

  for (const link of links) {
    const existing = await prisma.movieGenre.findUnique({
      where: {
        movieId_genreId: {
          movieId: link.movieId,
          genreId: targetGenre.id,
        },
      },
    });

    if (!existing) {
      await prisma.movieGenre.create({
        data: {
          movieId: link.movieId,
          genreId: targetGenre.id,
        },
      });
    }
  }

  await prisma.movieGenre.deleteMany({ where: { genreId: sourceGenre.id } });
  await prisma.genre.delete({ where: { id: sourceGenre.id } });

  return { changed: true, from: sourceGenre.name, to: targetName, movieCount: links.length };
}

async function main() {
  const genres = await prisma.genre.findMany({ orderBy: { name: 'asc' } });
  const results = [];

  for (const genre of genres) {
    const targetName = normalizeGenreName(genre.name);
    results.push(await mergeGenre(genre, targetName));
  }

  const changed = results.filter((item) => item.changed);
  if (!changed.length) {
    console.log('Genres are already synchronized.');
    return;
  }

  console.log('Synchronized genres:');
  changed.forEach((item) => {
    console.log(`- ${item.from} -> ${item.to} (${item.movieCount} movies)`);
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
