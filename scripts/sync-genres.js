/**
 * Mục đích: Mã nguồn phục vụ khởi tạo và tiện ích dùng chung; các khối bên dưới được giữ tách biệt theo trách nhiệm.
 */
const { PrismaClient } = require('@prisma/client');
const dotenv = require('dotenv');
const { normalizeGenreName } = require('./genre-map');

dotenv.config();

const prisma = new PrismaClient();

// Cập nhật trạng thái hoặc dữ liệu trong khối mergeGenre.
async function mergeGenre(sourceGenre, targetName) {
  // Đánh giá điều kiện để chọn nhánh xử lý phù hợp và tránh cập nhật sai trạng thái.
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

  // Duyệt tập dữ liệu để xử lý từng phần tử theo cùng một quy tắc.
  for (const link of links) {
    const existing = await prisma.movieGenre.findUnique({
      where: {
        movieId_genreId: {
          movieId: link.movieId,
          genreId: targetGenre.id,
        },
      },
    });

    // Chặn luồng hiện tại khi dữ liệu hoặc điều kiện bắt buộc chưa được đáp ứng.
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

// Khởi tạo luồng main và chuẩn bị các phụ thuộc cần thiết.
async function main() {
  const genres = await prisma.genre.findMany({ orderBy: { name: 'asc' } });
  const results = [];

  // Duyệt tập dữ liệu để xử lý từng phần tử theo cùng một quy tắc.
  for (const genre of genres) {
    const targetName = normalizeGenreName(genre.name);
    results.push(await mergeGenre(genre, targetName));
  }

  const changed = results.filter((item) => item.changed);
  // Kiểm tra số lượng phần tử để xử lý trường hợp rỗng hoặc vượt giới hạn.
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
