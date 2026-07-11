# Hướng Dẫn Chạy Và Demo Dự Án Cinema

Tài liệu này ghi lại cách chạy Docker, database, backend, frontend và các phần chính đã làm trên nhánh của Quang Huy. Người khác pull branch về nên đọc file này trước khi chạy.

## 1. Chuẩn Bị

Cần có:

- Node.js
- Docker Desktop
- Git
- PowerShell trên Windows

Tạo file `.env` từ `.env.example` nếu chưa có:

```powershell
cd "D:\My Project\Project 4 - Cinema"
Copy-Item .env.example .env
```

Các biến quan trọng:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/cinema_ticket_system?schema=public"
FRONTEND_URL="http://localhost:5173"
TMDB_API_KEY="api_key_cua_ban"
TMDB_IMAGE_BASE_URL="https://image.tmdb.org/t/p"
```

## 2. Chạy Docker

```powershell
cd "D:\My Project\Project 4 - Cinema"
docker compose up -d
docker ps
```

Docker chạy:

- PostgreSQL: database chính
- Redis: giữ ghế tạm thời bằng TTL

## 3. Cài Dependency

```powershell
cd "D:\My Project\Project 4 - Cinema"
npm.cmd install
cd backend
npm.cmd install
```

## 4. Chọn Cách Tạo Database

### Cách A: Dùng dump để giống máy hiện tại

Dùng cách này nếu muốn dữ liệu giống trạng thái đã test: phim, rạp, suất chiếu, user, booking, vé, payment và combo bắp nước.

```powershell
cd "D:\My Project\Project 4 - Cinema"
docker compose up -d
docker exec project4-cinema-postgres-1 psql -U postgres -c "DROP DATABASE IF EXISTS cinema_ticket_system;"
docker exec project4-cinema-postgres-1 psql -U postgres -c "CREATE DATABASE cinema_ticket_system;"
Get-Content database\cinema_ticket_system_dump.sql | docker exec -i project4-cinema-postgres-1 psql -U postgres -d cinema_ticket_system
npx.cmd prisma generate
```

Sau khi import dump thì không chạy `prisma db seed`, vì seed sẽ reset dữ liệu test trong dump.

### Cách B: Tạo database sạch từ seed

Dùng cách này nếu muốn dữ liệu mẫu sạch theo `prisma/seed.js`.

```powershell
cd "D:\My Project\Project 4 - Cinema"
npx.cmd prisma migrate dev
npx.cmd prisma generate
npx.cmd prisma db seed
```

Mở Prisma Studio:

```powershell
cd "D:\My Project\Project 4 - Cinema"
npx.cmd prisma studio
```

Prisma Studio chạy tại:

```text
http://localhost:5555
```

## 5. Chạy Backend

Mở terminal mới:

```powershell
cd "D:\My Project\Project 4 - Cinema\backend"
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

Nếu gặp lỗi Prisma Client bị khóa file DLL, tắt backend, Prisma Studio và các terminal Node đang chạy rồi chạy lại:

```powershell
cd "D:\My Project\Project 4 - Cinema"
npx.cmd prisma generate
```

## 6. Chạy Frontend

Mở terminal mới:

```powershell
cd "D:\My Project\Project 4 - Cinema\frontend"
npx.cmd vite --host 0.0.0.0
```

Frontend chạy tại:

```text
http://localhost:5173
```

## 7. Account Demo

Kiểm tra account trong `prisma/seed.js` hoặc Prisma Studio bảng `users`.

Thường có:

- Admin: `admin@cinema.test` / `admin123`
- User demo: `hung@example.com` / `user123`

## 8. Những Phần Đã Làm

### Database và Prisma

- PostgreSQL là nguồn dữ liệu chính.
- Redis chỉ dùng để giữ ghế tạm thời.
- Có dữ liệu rạp tại Đà Nẵng.
- Có chuỗi rạp và chi nhánh rạp, ví dụ CGV có nhiều chi nhánh.
- Có phim, thể loại, rạp, phòng chiếu, ghế, suất chiếu.
- Có bảng giá vé theo rạp.
- Có combo bắp nước.
- Có booking, payment, ticket và QR theo booking.

### Movie và TMDB

- Admin có thể thêm phim bằng TMDB ID.
- Backend lấy poster, banner, mô tả và trailer từ TMDB nếu có API key.
- User chỉ xem phim đang chiếu hoặc sắp chiếu.
- User không cần quan tâm TMDB ID.

### Luồng Người Dùng

Luồng hiện tại:

1. Chọn phim.
2. Chọn rạp, ngày chiếu và giờ chiếu.
3. Chọn ghế.
4. Sang trang chọn combo bắp nước.
5. Có thể chọn combo bằng nút `+` / `-` hoặc bấm `Bỏ qua`.
6. Sang trang thanh toán.
7. Thanh toán thành công thì tạo vé.
8. Vào `Vé Của Tôi` để xem QR.

Khách có thể xem phim, suất chiếu và sơ đồ ghế trước khi đăng nhập. Khi thanh toán mới cần đăng nhập.

### Ghế Và Giữ Ghế

- Ghế đang chọn được giữ tạm bằng Redis TTL.
- Nếu quá thời gian giữ ghế mà chưa thanh toán, ghế được mở lại.
- Khi thanh toán thành công, ghế chuyển sang đã đặt trong PostgreSQL.
- Ghế VIP nằm ở vùng trung tâm.
- Ghế đôi nằm ở hàng cuối.

### Admin

- Quản lý phim.
- Quản lý thể loại.
- Quản lý rạp và chi nhánh.
- Quản lý phòng chiếu.
- Quản lý ghế và layout phòng.
- Quản lý suất chiếu.
- Quản lý combo bắp nước.
- Xem booking và chi tiết booking.
- Dashboard doanh thu hiển thị bằng VND.

Các lỗi đã sửa trong admin:

- Lịch chiếu hiển thị đúng `Đặt/Tổng` theo số ghế đã thanh toán.
- Phòng chiếu hiển thị đúng `Hàng x Cột`, không còn `0x0`.
- Chi tiết đặt vé hiển thị user, phim, rạp, phòng, ghế, combo, payment, ticket và QR.

## 9. Kiểm Tra Chất Lượng

Kiểm tra Prisma:

```powershell
cd "D:\My Project\Project 4 - Cinema"
npx.cmd prisma validate
npx.cmd prisma generate
```

Build backend:

```powershell
cd "D:\My Project\Project 4 - Cinema\backend"
npm.cmd run build
```

Kiểm tra frontend các file chính:

```powershell
cd "D:\My Project\Project 4 - Cinema"
node --check frontend\showtimes\views\ShowtimeView.js
node --check frontend\rooms\views\RoomView.js
node --check frontend\bookings\views\BookingView.js
node --check frontend\concessions\views\ConcessionView.js
node --check frontend\payments\views\PaymentView.js
```

## 10. Export Lại Dump Khi Database Thay Đổi

Khi bạn thêm dữ liệu trực tiếp bằng admin hoặc test thêm booking/vé/payment và muốn người khác có dữ liệu giống hệt, export lại dump:

```powershell
cd "D:\My Project\Project 4 - Cinema"
docker exec project4-cinema-postgres-1 pg_dump -U postgres --clean --if-exists --no-owner --no-privileges -d cinema_ticket_system -f /tmp/cinema_ticket_system_dump.sql
docker cp project4-cinema-postgres-1:/tmp/cinema_ticket_system_dump.sql database\cinema_ticket_system_dump.sql
```

Sau đó commit file:

```powershell
git add database\cinema_ticket_system_dump.sql docs\README.md
git commit -m "docs: update database dump and run guide"
```

Lưu ý: Git không push database PostgreSQL đang chạy trong Docker. Git chỉ push được schema, seed, migration và file dump SQL.
