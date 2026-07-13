# Tổng kết chỉnh sửa dự án CineTicket

Ngày thực hiện: **14/07/2026**  
Phạm vi commit chính: `e8986a5` và `c64eb9a`  
Nhánh đã cập nhật: `origin/main`

## 1. Mục tiêu công việc

Đợt chỉnh sửa này thực hiện ba mục tiêu:

1. Đọc và bổ sung chú thích tiếng Việt cho mã nguồn.
2. Kiểm tra các lớp, phương thức và chức năng bị viết lặp để chuyển sang dùng chung.
3. Bổ sung quy tắc vào `AGENTS.md` để các lần phát triển sau tiếp tục tuân thủ clean code.

## 2. Bổ sung và chuẩn hóa chú thích

- Bổ sung mô tả tiếng Việt cho lớp, object, public method và các khối nghiệp vụ quan trọng.
- Việt hóa các comment tiếng Anh trong backend, frontend, Prisma migration, script và CSS.
- Bổ sung mô tả cho enum và model trong Prisma schema.
- Chú thích các phần liên quan đến booking, payment, ticket, seat hold, TMDB, admin và seed data.
- Loại bỏ **88 comment trùng liên tiếp** phát sinh trong quá trình rà soát.
- Giữ nguyên các định danh kỹ thuật như Prisma, Redis, TMDB, VNPay, SePay, DTO, API và HTTP.
- Comment được định hướng giải thích mục đích và quy tắc nghiệp vụ thay vì chỉ diễn đạt lại câu lệnh.

Các loại file không hỗ trợ comment hoặc là dữ liệu sinh tự động như JSON cấu hình, lockfile, ảnh, CSV và database dump không bị chèn comment tùy tiện.

## 3. Các chức năng trùng lặp đã được gộp

### 3.1. Client TMDB dùng chung

Tạo file:

- `scripts/tmdb-client.js`

Các chức năng được gom:

- Kiểm tra thông tin xác thực TMDB.
- Tạo URL và query parameter.
- Gọi TMDB API và chuẩn hóa lỗi HTTP.
- Tạo đường dẫn ảnh TMDB.
- Chọn trailer YouTube phù hợp.
- Tìm trailer theo thứ tự tiếng Việt rồi tiếng Anh.

Hai script sau đã chuyển sang sử dụng client chung:

- `scripts/add-tmdb-movie.js`
- `scripts/sync-tmdb-movies.js`

### 3.2. Bản đồ thể loại dùng một nguồn dữ liệu

Tạo nguồn dữ liệu chuẩn:

- `backend/src/common/genre-map.json`

Các phần sau cùng đọc dữ liệu từ nguồn này:

- `backend/src/common/genre-map.ts`
- `scripts/genre-map.js`

Việc này ngăn tên thể loại giữa backend và script đồng bộ TMDB bị lệch nhau.

### 3.3. Định dạng ngày giờ Đà Nẵng

Tạo file:

- `backend/src/common/danang-date.ts`

Hai hàm dùng chung:

- `formatDateInDaNang()`
- `formatTimeInDaNang()`

Các service đã chuyển sang sử dụng:

- `backend/src/movies/movies.service.ts`
- `backend/src/seats/seats.service.ts`

Múi giờ được chuẩn hóa thành `Asia/Ho_Chi_Minh`.

### 3.4. Tính toán sơ đồ ghế dùng chung

Tạo các file:

- `backend/src/common/seat-layout.js`
- `backend/src/common/seat-layout.d.ts`

Các chức năng dùng chung:

- `getVipZone()`: tính vùng ghế VIP nằm giữa sơ đồ.
- `addMinutes()`: cộng hoặc trừ phút từ một thời điểm.

Các nơi sử dụng:

- Admin service khi sinh sơ đồ ghế và kiểm tra lịch chiếu.
- Prisma seed khi tạo ghế và suất chiếu mẫu.

`backend/nest-cli.json` được cấu hình để sao chép utility JavaScript này sang thư mục build `dist`.

### 3.5. Helper frontend dùng chung

Bổ sung vào:

- `frontend/assets/js/utils/helpers.js`

Các helper mới:

- `formatTimeOfDay()`: định dạng thời gian thống nhất.
- `getMovieVisual()`: lấy poster/banner và dùng ảnh dự phòng khi thiếu.

Các hàm cục bộ trùng lặp đã được xóa khỏi:

- `frontend/bookings/views/BookingView.js`
- `frontend/showtimes/views/ShowtimeView.js`
- `frontend/tickets/views/TicketView.js`
- `frontend/users/views/UserView.js`

## 4. Những đoạn giống nhau được giữ riêng có chủ đích

Một số đoạn nhìn giống nhau nhưng không được gộp vì khác trách nhiệm:

- Prisma include giữa MoviesService và SeatsService trả về dữ liệu nghiệp vụ khác nhau.
- Upsert thể loại trong admin chạy bên trong Prisma transaction, trong khi script TMDB chạy độc lập.
- Controller, Model và View có tên thao tác tương tự nhưng thuộc domain khác nhau.
- Các thẻ đóng HTML của bảng quản trị chỉ giống về cấu trúc trình bày, không phải logic nghiệp vụ trùng.

Các đoạn này được giữ riêng để không phá vỡ transaction, quyền sở hữu domain và hợp đồng API.

## 5. Quy tắc clean code bổ sung vào AGENTS.md

Commit `c64eb9a` thêm các quy tắc bắt buộc:

- Phải tìm kiếm code có sẵn trước khi tạo lớp, phương thức hoặc helper mới.
- Kiểm tra cả trùng nội dung và trùng chức năng.
- Mỗi formatter, mapping, calculation và provider client chỉ có một nguồn chuẩn.
- Quy định vị trí cho backend common utility, frontend utility/component và script client.
- Không gộp máy móc khi khác transaction, authorization, validation hoặc state transition.
- Controller phải mỏng và chuyển nghiệp vụ sang service.
- Frontend Controller, Model và View phải giữ đúng trách nhiệm MVC.
- Comment phải bằng tiếng Việt, có ích, cập nhật và không trùng.
- Bắt buộc rà soát duplication và chạy `git diff --check` trước khi hoàn thành.

## 6. Kết quả kiểm tra

Các kiểm tra đã chạy thành công:

- `npm run build` trong backend.
- `npm test -- --runInBand`.
- **3 test suite**, **8 test**, tất cả đều đạt.
- `node --check` cho các file JavaScript.
- `npx prisma validate`.
- Kiểm tra utility TMDB, genre map và seat layout bằng Node.
- Xác nhận `seat-layout.js` xuất hiện đúng trong backend `dist`.
- `git diff --check` không phát hiện lỗi whitespace.
- Không còn comment trùng liên tiếp.

## 7. Thống kê commit

### Commit `e8986a5`

Thông điệp:

`refactor: reuse shared logic and add Vietnamese comments`

Thống kê:

- **133 file thay đổi**
- **2.634 dòng thêm**
- **759 dòng xóa**
- 5 file dùng chung mới được tạo.

### Commit `c64eb9a`

Thông điệp:

`docs: add clean code and reuse rules`

Thống kê:

- **1 file thay đổi**
- **77 dòng thêm** vào `AGENTS.md`

## 8. Lưu ý về thay đổi có sẵn

Trước khi bắt đầu, repository đã có thay đổi chưa commit trong:

- `frontend/assets/css/pages/booking.css`
- `frontend/bookings/models/BookingModel.js`
- `frontend/bookings/views/BookingView.js`

Các thay đổi giao diện và nghiệp vụ booking có sẵn này được giữ nguyên. Công việc trong đợt này chỉ bổ sung comment, kết nối helper dùng chung và tránh ghi đè nội dung đang phát triển.

File `run.txt` không nằm trong hai commit trên.

## 9. Trạng thái bàn giao

- Các thay đổi chính đã được push lên `origin/main`.
- Commit mới nhất của đợt clean code là `c64eb9a`.
- File báo cáo này được tạo sau hai commit trên và cần commit riêng nếu muốn lưu trên GitHub.
