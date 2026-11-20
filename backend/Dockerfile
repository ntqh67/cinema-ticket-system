# Image backend NestJS. Build context là thư mục gốc dự án vì Prisma schema nằm ở ./prisma.
# Giữ bố cục như môi trường dev: Prisma Client sinh ở /app/node_modules, backend tìm lên từ /app/backend.
FROM node:22-alpine
RUN apk add --no-cache openssl
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci
COPY backend/package.json backend/package-lock.json ./backend/
RUN npm ci --prefix backend

COPY prisma ./prisma
# Seed dùng chung bảng ánh xạ thể loại trong scripts/ và backend/src/common.
COPY scripts ./scripts
RUN npx prisma generate

COPY backend ./backend
RUN npm run build --prefix backend

WORKDIR /app/backend
ENV NODE_ENV=production PORT=3000
EXPOSE 3000
# Áp migration trước khi khởi động; seed dữ liệu demo chạy riêng (xem README).
CMD ["sh", "-c", "npx prisma migrate deploy --schema ../prisma/schema.prisma && node dist/main"]
