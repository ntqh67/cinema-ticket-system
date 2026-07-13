# Hướng Dẫn Chạy Và Đóng Gói Dự Án CRTicket

Tài liệu này dành cho người pull branch về chạy lại dự án. Mục tiêu chính của branch hiện tại là: **người khác import dump database sẽ có dữ liệu giống máy hiện tại**, gồm phim, rạp CR Cinema, phòng chiếu, ghế, suất chiếu, combo bắp nước, user/booking/payment/ticket demo nếu dump có lưu.

Backend dùng PostgreSQL làm dữ liệu chính. Redis chỉ dùng để giữ ghế tạm thời bằng TTL.

## 1. Chuẩn Bị

Cần có:

- Node.js
- Docker Desktop
- Git
- PowerShell

Tạo `.env` từ file mẫu nếu chưa có:

```powershell
cd "D:\My Project\Project 4 - Cinema"
Copy-Item .env.example .env
```

Các biến môi trường chính:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/cinema_ticket_system?schema=public"
FRONTEND_URL="http://localhost:5173"
TMDB_API_KEY="api_key_cua_ban"
TMDB_IMAGE_BASE_URL="https://image.tmdb.org/t/p"
```

`TMDB_API_KEY` chỉ cần khi admin thêm hoặc đồng bộ phim từ TMDB. Nếu chỉ chạy dữ liệu dump sẵn thì chưa bắt buộc.

## 2. Chạy Docker

```powershell
cd "D:\My Project\Project 4 - Cinema"
docker compose up -d
docker ps
```

Docker sẽ chạy:

- PostgreSQL: `localhost:5432`
- Redis: `localhost:6379`

## 3. Cài Dependency

```powershell
cd "D:\My Project\Project 4 - Cinema"
npm.cmd install
cd backend
npm.cmd install
```

## 4. Chạy Database Giống Hệt Máy Hiện Tại

Để người khác có database giống hệt dump trong repo, dùng file:

```text
database/cinema_ticket_system_dump.sql
```

Chạy lệnh sau:

```powershell
cd "D:\My Project\Project 4 - Cinema"
powershell -ExecutionPolicy Bypass -File .\scripts\import-database-dump.ps1
```

Lưu ý:

- Lệnh này sẽ import lại dump vào PostgreSQL container.
- Dump có `--clean --if-exists`, nên các bảng/dữ liệu cũ trong database local sẽ bị ghi đè theo dump.
- Sau khi import dump thì **không chạy** `npx.cmd prisma db seed`, vì seed sẽ reset dữ liệu theo seed code, không còn giống dump hiện tại.

Nếu muốn tạo database sạch từ migration và seed thay vì dùng dump:

```powershell
cd "D:\My Project\Project 4 - Cinema"
npx.cmd prisma migrate dev
npx.cmd prisma generate
npx.cmd prisma db seed
```

Cách này phù hợp khi muốn dữ liệu mẫu sạch, nhưng không đảm bảo giống hệt database đang dùng để demo.

## 5. Export Database Hiện Tại Thành Dump

Khi bạn chỉnh dữ liệu bằng admin, thêm phim, thêm suất chiếu, đặt vé test, hoặc cập nhật ảnh rạp và muốn người khác pull về giống hệt, hãy export lại dump:

```powershell
cd "D:\My Project\Project 4 - Cinema"
powershell -ExecutionPolicy Bypass -File .\scripts\export-database-dump.ps1
```

Sau đó commit file:

```powershell
git add database\cinema_ticket_system_dump.sql
git commit -m "chore: update database dump"
```

## 6. Chạy Backend

```powershell
cd "D:\My Project\Project 4 - Cinema\backend"
npm.cmd run start:dev
```

Backend chạy tại:

- API: `http://localhost:3000`
- Swagger: `http://localhost:3000/api/docs`

Nếu gặp lỗi Prisma Client bị khóa file DLL:

```powershell
cd "D:\My Project\Project 4 - Cinema"
taskkill /F /IM node.exe
npx.cmd prisma generate
```

Sau đó chạy lại backend.

## 7. Chạy Frontend

```powershell
cd "D:\My Project\Project 4 - Cinema\frontend"
npx.cmd vite --host 0.0.0.0 --port 5173
```

Frontend chạy tại:

```text
http://localhost:5173
```

Nếu giao diện vẫn hiện dữ liệu cũ, mở DevTools và clear `localStorage`, hoặc thử `Ctrl + F5`.

## 8. Prisma Studio

```powershell
cd "D:\My Project\Project 4 - Cinema"
npx.cmd prisma studio
```

Prisma Studio chạy tại:

```text
http://localhost:5555
```

## 9. Account Demo

Account thường có trong dump/seed:

- Admin: `admin@cinema.test` / `admin123`
- User demo: `hung@example.com` / `user123`

Nếu dữ liệu account khác, kiểm tra trong Prisma Studio bảng `users`.

## 10. Những Phần Đã Làm

- Database dùng PostgreSQL, Redis dùng cho giữ ghế tạm.
- Dữ liệu rạp hiện tại là một chuỗi chính `CR Cinema` với 7 chi nhánh tại Đà Nẵng: `CR01` đến `CR07`.
- Mỗi chi nhánh có phòng chiếu, ghế, suất chiếu, bảng giá vé và combo bắp nước.
- Ảnh rạp được lưu local trong `frontend/assets/images/cinemas`.
- Phim có phân loại độ tuổi `P`, `C13`, `C16`, `C18`.
- Khi người dùng chuẩn bị chọn ghế phim `C13`, `C16`, `C18`, hệ thống hiện modal cảnh báo cứng và yêu cầu bấm `Tôi đã hiểu và đồng ý`.
- Luồng khách hàng: chọn phim, chọn rạp/suất, chọn ghế, chọn hoặc bỏ qua combo bắp nước, thanh toán online demo, xem vé điện tử.
- Vé điện tử dùng một QR theo booking và lịch sử vé theo user.
- Admin có quản lý phim, rạp, phòng, ghế, suất chiếu, booking, dashboard và combo.
- Admin có thể thêm phim bằng TMDB ID nếu có `TMDB_API_KEY`.
- Phần khuyến mãi đã được gỡ khỏi navbar, route, admin sidebar và flow thanh toán.

## 11. Kiểm Tra Nhanh

```powershell
cd "D:\My Project\Project 4 - Cinema"
npx.cmd prisma validate
node --check prisma\seed.js
node --check scripts\add-tmdb-movie.js
node --check scripts\sync-tmdb-movies.js
cd backend
npm.cmd run build
```

Kiểm tra dữ liệu chính trong Prisma Studio:

- `cinema_chains` chỉ có `CR Cinema`.
- `cinemas` có đúng 7 chi nhánh `CR01` đến `CR07`.
- `cinemas.imageUrl` có đường dẫn ảnh local.
- `movies.ageRating` có dữ liệu.
- `concession_combos` có combo bắp nước.
- `showtimes`, `rooms`, `seats`, `bookings`, `payments`, `tickets` có dữ liệu giống dump sau khi import.

## 12. Luồng Demo

1. Chạy Docker.
2. Import database dump.
3. Chạy Backend.
4. Chạy Frontend.
5. Đăng nhập user hoặc đăng ký user mới.
6. Vào danh sách phim, mở chi tiết phim.
7. Chọn rạp, chọn suất chiếu.
8. Nếu phim giới hạn tuổi, xác nhận cảnh báo.
9. Chọn ghế.
10. Chọn hoặc bỏ qua combo bắp nước.
11. Thanh toán online demo.
12. Vào `Vé Của Tôi` để xem vé điện tử và QR.
13. Vào admin để kiểm tra booking, suất chiếu và doanh thu.

## 13. Ghi Chú Cho Nhóm

Nếu muốn mọi người chạy giống hệt database của bạn:

1. Bạn chỉnh dữ liệu trên máy.
2. Chạy `.\scripts\export-database-dump.ps1`.
3. Commit `database/cinema_ticket_system_dump.sql` cùng code liên quan.
4. Người khác pull về.
5. Người khác chạy `.\scripts\import-database-dump.ps1`.

Không commit file `.env` thật nếu có API key hoặc secret.
