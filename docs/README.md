# Hướng Dẫn Chạy Dự Án Cinema Ticket System

Tài liệu này ghi lại cách chạy Docker, backend, frontend và các phần chính đã làm trên nhánh của Quang Huy. Người khác pull branch về có thể đọc file này trước khi chạy hoặc hỏi ChatGPT/Codex dựa trên nội dung này.

## 1. Chuẩn Bị Môi Trường

Cần cài sẵn:

- Node.js
- Docker Desktop
- Git
- PowerShell trên Windows

Tạo file `.env` ở thư mục gốc từ `.env.example`:

```powershell
cd "D:\My Project\Project 4 - Cinema"
Copy-Item .env.example .env
```

Kiểm tra các biến quan trọng trong `.env`:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/cinema_ticket_system?schema=public"
FRONTEND_URL="http://localhost:5173"
TMDB_API_KEY="api_key_cua_ban"
TMDB_IMAGE_BASE_URL="https://image.tmdb.org/t/p"
VNPAY_DEMO_MODE="true"
```

Không commit API key thật lên GitHub.

## 2. Chạy Docker Database

Ở thư mục gốc dự án:

```powershell
cd "D:\My Project\Project 4 - Cinema"
docker compose up -d
```

Docker sẽ chạy:

- PostgreSQL: database chính
- Redis: giữ ghế tạm thời bằng TTL

Kiểm tra container:

```powershell
docker ps
```

## 3. Cài Dependency, Migration Và Seed

Ở thư mục gốc:

```powershell
cd "D:\My Project\Project 4 - Cinema"
npm.cmd install
npx.cmd prisma migrate dev
npx.cmd prisma generate
npx.cmd prisma db seed
```

Lưu ý: `prisma db seed` sẽ reset dữ liệu test như booking/vé cũ.

Mở Prisma Studio để xem database:

```powershell
npx.cmd prisma studio
```

Prisma Studio chạy tại:

```text
http://localhost:5555
```

## 4. Chạy Backend

Mở terminal mới:

```powershell
cd "D:\My Project\Project 4 - Cinema\backend"
npm.cmd install
npm.cmd run start:dev
```

Backend chạy tại:

```text
http://localhost:3000
```

Swagger API:

```text
http://localhost:3000/api/docs
```

Nếu gặp lỗi Prisma Client bị khóa, tắt backend/frontend/Prisma Studio rồi chạy lại:

```powershell
cd "D:\My Project\Project 4 - Cinema"
npx.cmd prisma generate
```

## 5. Chạy Frontend

Mở terminal mới:

```powershell
cd "D:\My Project\Project 4 - Cinema\frontend"
npx.cmd vite --host 0.0.0.0
```

Frontend chạy tại:

```text
http://localhost:5173
```

## 6. Tài Khoản Seed

Admin:

```text
Email: admin@cinema.test
Password: DevAdmin123!
```

Staff:

```text
Email: staff@cinema.test
Password: DevStaff123!
```

Customer:

```text
Email: customer@cinema.test
Password: DevCustomer123!
```

User demo:

```text
Email: hung@example.com
Password: user123
```

## 7. Các Phần Đã Làm Trên Branch Này

### Database và Prisma

- PostgreSQL là nguồn dữ liệu chính.
- Redis chỉ dùng để giữ ghế tạm thời.
- Thêm dữ liệu rạp Đà Nẵng.
- Có chuỗi rạp `CinemaChain`, ví dụ CGV có nhiều chi nhánh.
- Thêm `tmdbId` cho phim để đồng bộ poster/trailer từ TMDB.
- Thêm `MovieReview` để user đánh giá phim.

### Movie API và TMDB

- Admin có thể thêm phim bằng TMDB ID.
- Backend tự gọi TMDB để lấy:
  - tên phim
  - mô tả
  - poster
  - trailer
  - thời lượng
  - ngày phát hành
  - thể loại
- Admin có thể cập nhật danh sách phim sắp chiếu từ TMDB.
- User chỉ thấy phim đang chiếu hoặc sắp chiếu, không thấy TMDB ID.

### Booking và Ghế

- User có thể xem phim, chọn suất chiếu, xem sơ đồ ghế.
- Ghế được giữ tạm bằng Redis.
- Khi thanh toán thành công, booking chuyển `PAID`, ghế chuyển `BOOKED`, vé được tạo.
- Vé dùng một QR theo booking.

### Rating Phim

- Admin không tự nhập rating phim.
- User chỉ được đánh giá phim nếu đã mua vé và thanh toán thành công.
- Rating trung bình được tính từ bảng `MovieReview`.
- User chưa mua vé chỉ xem được đánh giá.

### Admin Showtime

- Admin có thể tạo lịch chiếu thật cho phim mới.
- Form tạo lịch chiếu gồm:
  - phim
  - rạp/chi nhánh
  - phòng chiếu
  - ngày chiếu
  - giờ bắt đầu
  - giá ghế thường
- Backend tự tính validation:
  - không trùng phòng cùng giờ
  - có buffer dọn phòng 30 phút
  - tự tạo `ShowtimeSeat` cho toàn bộ ghế phòng đó

### Dashboard

- Dashboard admin lấy dữ liệu thật từ PostgreSQL.
- Doanh thu tính bằng VND từ các payment thành công.

## 8. Luồng Demo Nhanh

1. Chạy Docker.
2. Chạy migration, generate, seed.
3. Chạy backend.
4. Chạy frontend.
5. Đăng nhập admin.
6. Vào `#/admin/movies`.
7. Thêm phim bằng TMDB ID hoặc cập nhật phim sắp chiếu.
8. Vào `#/admin/showtimes`.
9. Tạo lịch chiếu cho phim mới.
10. Đăng nhập user.
11. Chọn phim, chọn suất chiếu, chọn ghế, thanh toán.
12. Vào vé của tôi để xem QR.
13. Sau khi đã thanh toán, user có thể đánh giá phim.

## 9. Lệnh Kiểm Tra Trước Khi Commit/Push

```powershell
cd "D:\My Project\Project 4 - Cinema"
npx.cmd prisma validate
npx.cmd prisma generate
```

```powershell
cd "D:\My Project\Project 4 - Cinema\backend"
npm.cmd run build
```

Kiểm tra frontend file chính:

```powershell
cd "D:\My Project\Project 4 - Cinema"
node --check frontend\movies\views\MovieView.js
node --check frontend\showtimes\views\ShowtimeView.js
node --check frontend\reports\views\ReportView.js
```

## 10. Tài Liệu Liên Quan

- [Booking service API](./booking-service.md)
- [Booking demo workflow](./booking-demo.md)
- [Da Nang demo setup](./danang-demo.md)

## 11. Dùng Database Giống Máy Quang Huy

Nếu muốn người khác pull branch về và có dữ liệu giống máy hiện tại, dùng file dump:

```text
database/cinema_ticket_system_dump.sql
```

Sau khi chạy Docker, import database bằng PowerShell:

```powershell
cd "D:\My Project\Project 4 - Cinema"
docker compose up -d
docker exec project4-cinema-postgres-1 psql -U postgres -c "DROP DATABASE IF EXISTS cinema_ticket_system;"
docker exec project4-cinema-postgres-1 psql -U postgres -c "CREATE DATABASE cinema_ticket_system;"
Get-Content database\cinema_ticket_system_dump.sql | docker exec -i project4-cinema-postgres-1 psql -U postgres -d cinema_ticket_system
npx.cmd prisma migrate dev
npx.cmd prisma generate
```

File dump này chứa cả dữ liệu test đã tạo trực tiếp trên máy:

- phim thêm bằng admin/TMDB
- suất chiếu tạo thủ công trong admin
- user đăng ký thêm
- booking, payment, ticket, QR test

Lưu ý: Git không push database PostgreSQL đang chạy trong Docker. Muốn mọi người có dữ liệu giống hệt sau mỗi lần cập nhật lớn, cần export lại file dump rồi commit/push file dump mới.
