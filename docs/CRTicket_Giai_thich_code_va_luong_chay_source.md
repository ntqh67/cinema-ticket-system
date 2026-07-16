# Tài liệu giải thích code và luồng chạy dự án CRTicket

Tài liệu này dùng để ôn báo cáo và trả lời vấn đáp. Mục tiêu là giúp hiểu dự án chạy như thế nào, file nào chịu trách nhiệm phần nào, dữ liệu đi từ frontend đến backend và database ra sao.

Dự án CRTicket là hệ thống website đặt vé rạp phim tại Đà Nẵng, gồm frontend JavaScript thuần, backend NestJS, PostgreSQL, Redis và tích hợp thanh toán SePay QR.

# 1. Tổng quan kiến trúc

Dự án được tổ chức theo mô hình modular monolith. Toàn bộ backend nằm trong một ứng dụng NestJS, nhưng được chia module theo nghiệp vụ: auth, movies, cinemas, seats, seat-holds, bookings, concessions và admin.

- Frontend nằm trong thư mục `frontend/`, chịu trách nhiệm hiển thị giao diện khách hàng và admin.
- Backend nằm trong thư mục `backend/src/`, chịu trách nhiệm xử lý nghiệp vụ và cung cấp API.
- Database schema nằm trong `prisma/schema.prisma`, định nghĩa bảng, quan hệ và enum.
- Database dump nằm trong `database/cinema_ticket_system_dump.sql`, dùng để import dữ liệu mẫu giống máy hiện tại.
- Docker chạy PostgreSQL và Redis.

# 2. Luồng chạy tổng quát

Luồng chính của khách hàng:

`Xem phim -> Chọn rạp/suất chiếu -> Chọn ghế -> Giữ ghế -> Đăng nhập -> Chọn combo -> Thanh toán SePay -> Nhận vé QR -> Xem Vé Của Tôi`

Khách có thể xem phim, rạp, suất chiếu và sơ đồ ghế trước. Khi tạo booking hoặc thanh toán thì cần đăng nhập để vé gắn đúng với tài khoản người dùng trong database.

# 3. Frontend hoạt động như thế nào

Frontend dùng HTML, CSS và JavaScript thuần, không dùng React hay Vue. Router là hash router, nghĩa là URL có dạng `#/movies`, `#/seats/:id`, `#/payment`.

- `frontend/index.html`: file HTML chính, load CSS và JavaScript.
- `frontend/assets/js/utils/api.js`: nơi gọi API backend và map dữ liệu backend sang shape mà UI dùng.
- `frontend/assets/js/utils/helpers.js`: helper format tiền, ngày giờ, ảnh phim và ảnh rạp.
- `frontend/movies/views/MovieView.js`: render danh sách phim, chi tiết phim, trailer và suất chiếu.
- `frontend/seats/views/SeatView.js`: render sơ đồ ghế và thông tin ghế đã chọn.
- `frontend/payments/views/PaymentView.js`: render thanh toán SePay QR và tóm tắt đơn hàng.
- `frontend/tickets/views/TicketView.js`: render chi tiết vé, QR vé và chức năng in vé.
- `frontend/users/views/UserView.js`: render tài khoản, Vé Của Tôi và lịch sử booking.
- `frontend/cinemas/views/CinemaView.js`: render danh sách rạp và chi tiết rạp.

# 4. Backend hoạt động như thế nào

Backend là NestJS. Mỗi module thường có controller và service. Controller nhận HTTP request, service xử lý nghiệp vụ và gọi Prisma để đọc/ghi PostgreSQL.

- `backend/src/movies/movies.controller.ts`: nhận request API liên quan phim.
- `backend/src/movies/movies.service.ts`: lấy phim, chi tiết phim, suất chiếu và review từ database.
- `backend/src/cinemas/cinemas.controller.ts`: API public danh sách rạp.
- `backend/src/seats/seats.service.ts`: lấy sơ đồ ghế theo suất chiếu, kết hợp trạng thái database và Redis hold.
- `backend/src/seat-holds/`: xử lý giữ ghế tạm bằng Redis TTL.
- `backend/src/bookings/bookings.controller.ts`: API tạo booking, thanh toán, webhook SePay và trạng thái payment.
- `backend/src/bookings/bookings.service.ts`: file nghiệp vụ trọng tâm, xử lý booking, payment, ticket và SePay.
- `backend/src/admin/admin.controller.ts`: API quản trị phim, rạp, phòng, suất chiếu và dashboard.
- `backend/src/admin/admin.service.ts`: xử lý nghiệp vụ admin và kiểm tra dữ liệu khi tạo/sửa.

# 5. Database và các bảng chính

PostgreSQL là nguồn dữ liệu chính. Redis không lưu dữ liệu chính thức, chỉ dùng để giữ ghế tạm thời.

- `User`: tài khoản khách hàng, admin, nhân viên.
- `Movie`: thông tin phim, poster, trailer, thời lượng, phân loại tuổi.
- `Genre`: thể loại phim.
- `CinemaChain`: chuỗi rạp hoặc thương hiệu, ví dụ CR Cinema.
- `Cinema`: chi nhánh rạp, ví dụ CR01 Riverside, CR02 Central Park.
- `Room`: phòng chiếu thuộc một chi nhánh rạp.
- `Seat`: ghế gốc trong phòng, ví dụ A1, A2.
- `Showtime`: suất chiếu của một phim tại một phòng trong một khung giờ.
- `ShowtimeSeat`: trạng thái ghế theo từng suất chiếu.
- `Booking`: đơn đặt vé của user.
- `BookingItem`: các ghế được chọn trong booking.
- `Payment`: thông tin thanh toán, provider, số tiền, trạng thái.
- `Ticket`: vé điện tử sau khi thanh toán thành công.
- `ConcessionCombo`: combo bắp nước.
- `BookingComboItem`: combo người dùng mua kèm booking.

# 6. Vì sao cần Seat và ShowtimeSeat

`Seat` là ghế vật lý cố định của phòng. Ví dụ Screen 1 có ghế A1. Nhưng ghế A1 ở suất 9:00 có thể đã bán, còn ghế A1 ở suất 14:00 vẫn còn trống. Vì vậy cần `ShowtimeSeat` để lưu trạng thái ghế theo từng suất chiếu.

Nếu bị hỏi, có thể trả lời ngắn gọn: `Seat` là ghế gốc, còn `ShowtimeSeat` là ghế của một suất chiếu cụ thể.

# 7. Luồng chọn ghế và giữ ghế

Khi người dùng click ghế, frontend gọi API giữ ghế. Backend lưu giữ ghế vào Redis bằng key theo `showtimeId` và `showtimeSeatId`. Thời gian giữ ghế có TTL, ví dụ 5 hoặc 10 phút tùy cấu hình.

Trong lúc ghế chỉ được giữ tạm, database PostgreSQL chưa đổi trạng thái ghế thành `BOOKED`. Nếu người dùng không thanh toán, Redis tự hết hạn và ghế lại được chọn.

`AVAILABLE trong PostgreSQL + có Redis hold => frontend hiển thị là đang giữ`

`Sau thanh toán thành công => ShowtimeSeat.status = BOOKED`

# 8. Luồng booking

Khi người dùng chuẩn bị thanh toán, backend tạo `Booking` và `BookingItem`. Booking ban đầu có trạng thái `PENDING`. Các ghế trong booking vẫn phải còn hợp lệ, chưa bị `BOOKED` bởi người khác.

File quan trọng nhất là `backend/src/bookings/bookings.service.ts`. Trong service này có logic tạo booking, tạo payment SePay, xử lý webhook và tạo vé.

# 9. Luồng thanh toán SePay

SePay là phương thức thanh toán chính. Khi vào trang thanh toán, hệ thống tạo thông tin chuyển khoản gồm số tài khoản, ngân hàng, số tiền và nội dung chuyển khoản duy nhất theo booking.

Frontend hiển thị QR. Người dùng chuyển khoản đúng nội dung. SePay gửi webhook về backend. Backend kiểm tra webhook và xác nhận thanh toán.

Luồng xử lý:

`Frontend #/payment -> POST /api/bookings/:bookingId/sepay -> hiển thị QR`

`SePay nhận tiền -> POST /api/bookings/sepay-webhook`

`Backend xác nhận -> Payment SUCCESS, Booking PAID, ghế BOOKED, tạo Ticket`

Điểm quan trọng: frontend không tự xác nhận đã thanh toán. Chỉ webhook hợp lệ từ SePay mới được đánh dấu thanh toán thành công.

# 10. Vì sao cần transaction

Khi thanh toán thành công, hệ thống phải cập nhật nhiều bảng cùng lúc: `Payment`, `Booking`, `ShowtimeSeat`, `Ticket`. Nếu một bước lỗi mà các bước khác đã ghi database thì dữ liệu sẽ sai. Vì vậy backend dùng Prisma transaction để đảm bảo hoặc tất cả thành công, hoặc tất cả rollback.

# 11. Vé điện tử và QR

Sau khi thanh toán thành công, backend tạo `Ticket`. Frontend hiển thị vé trong mục Vé Của Tôi. QR đại diện cho booking/vé để nhân viên quét tại rạp.

Khách hàng không tự check-in. Check-in là nghiệp vụ của nhân viên hoặc admin.

- `frontend/tickets/views/TicketView.js`: render chi tiết vé, QR và in vé.
- `frontend/users/views/UserView.js`: render Vé Của Tôi và lịch sử booking.
- `backend/src/bookings/bookings.service.ts`: tạo ticket sau khi thanh toán thành công.

# 12. Luồng admin

Admin dùng backend API để quản lý dữ liệu thật trong PostgreSQL, không quản lý bằng localStorage.

- Phim: frontend `MovieView.js`, backend `admin.controller.ts` và `admin.service.ts`.
- Rạp chiếu: frontend `CinemaView.js`, backend admin service.
- Phòng chiếu: frontend `RoomView.js`, backend admin service.
- Lịch chiếu: frontend `ShowtimeView.js`, backend admin service.
- Combo: concession modules và admin API.
- Doanh thu: dashboard admin lấy dữ liệu từ payment và booking đã thanh toán.

# 13. TMDB dùng để làm gì

TMDB dùng cho admin thêm phim nhanh bằng TMDB ID. Backend lấy tên phim, poster, trailer, thời lượng, ngày phát hành và thể loại. Sau đó lưu vào PostgreSQL.

User không cần quan tâm TMDB ID. Đây là chức năng dành cho admin.

# 14. Docker và môi trường chạy

Docker chỉ chạy PostgreSQL và Redis. Backend và frontend chạy trực tiếp bằng npm trên máy.

Lệnh cơ bản:

`docker compose up -d`

PostgreSQL chạy ở `localhost:5432`. Redis chạy ở `localhost:6379`.

File `.env` chứa `DATABASE_URL`, cấu hình SePay, TMDB API key và frontend URL. Backend phải restart sau khi sửa `.env`.

# 15. Cách nói khi bị hỏi code chạy từ đâu

- Frontend bắt đầu từ `frontend/index.html`, sau đó load các file JavaScript theo MVC.
- API frontend nằm ở `frontend/assets/js/utils/api.js`.
- Backend bắt đầu từ NestJS `main.ts`, module chính là `app.module.ts`.
- Controller nhận request, service xử lý nghiệp vụ, Prisma ghi/đọc PostgreSQL.
- Redis dùng cho giữ ghế tạm, không phải database chính.

# 16. Câu hỏi vấn đáp thường gặp

Hỏi: Vì sao không lưu ghế đang giữ vào PostgreSQL?

Trả lời: Vì ghế đang giữ chỉ là trạng thái tạm thời. Redis có TTL tự hết hạn, phù hợp hơn. PostgreSQL chỉ lưu trạng thái chính thức như `BOOKED` sau thanh toán.

Hỏi: Khi nào ghế chuyển sang `BOOKED`?

Trả lời: Chỉ sau khi payment thành công từ webhook SePay. Lúc đó backend cập nhật `ShowtimeSeat` trong transaction.

Hỏi: Nếu SePay gửi webhook 2 lần thì sao?

Trả lời: Backend cần xử lý idempotent. Nếu giao dịch đã xử lý thì không tạo vé hoặc cập nhật tiền lần nữa.

Hỏi: Vì sao cần `Booking` và `Ticket` riêng?

Trả lời: `Booking` là đơn đặt vé, có thể chứa nhiều ghế và combo. `Ticket` là vé điện tử được phát hành sau thanh toán.

Hỏi: Vì sao cần `BookingItem`?

Trả lời: Một booking có thể có nhiều ghế. `BookingItem` lưu từng ghế và đơn giá tại thời điểm đặt.

Hỏi: Làm sao biết vé thuộc user nào?

Trả lời: `Booking` có `userId`. Khi lấy Vé Của Tôi, backend lọc booking/ticket theo user hiện tại.

Hỏi: Vì sao dùng Prisma?

Trả lời: Prisma giúp định nghĩa schema, migration, type-safe query và transaction với PostgreSQL.

# 17. Những file nên học trước khi báo cáo

- `prisma/schema.prisma`: nắm database và quan hệ bảng.
- `backend/src/bookings/bookings.service.ts`: nắm booking, payment, ticket, SePay.
- `backend/src/movies/movies.service.ts`: nắm phim, suất chiếu, review.
- `frontend/payments/views/PaymentView.js`: nắm giao diện thanh toán QR.
- `frontend/seats/views/SeatView.js`: nắm sơ đồ ghế và chọn ghế.
- `backend/src/admin/admin.service.ts`: nắm quản trị phim, rạp, phòng, lịch chiếu.

# 18. Kịch bản demo đề xuất

- Mở trang chủ, giới thiệu CRTicket dành cho rạp phim tại Đà Nẵng.
- Vào phim đang chiếu, xem chi tiết phim, trailer, phân loại tuổi.
- Chọn rạp/suất chiếu, mở sơ đồ ghế.
- Chọn ghế, giải thích Redis giữ ghế tạm.
- Chọn combo bắp nước hoặc bỏ qua.
- Thanh toán SePay QR, giải thích webhook tự xác nhận.
- Mở Vé Của Tôi, xem QR vé điện tử.
- Vào admin, giới thiệu quản lý phim, rạp, phòng, lịch chiếu, combo, doanh thu.

# 19. Kết luận

CRTicket là hệ thống đặt vé rạp phim tập trung vào Đà Nẵng. Điểm mạnh của dự án là dùng dữ liệu thật trong PostgreSQL, giữ ghế tạm bằng Redis, thanh toán SePay QR, phát hành vé điện tử và có khu vực admin quản lý dữ liệu vận hành.

Khi báo cáo, không cần thuộc toàn bộ code. Chỉ cần nắm luồng dữ liệu: frontend gọi API, backend xử lý nghiệp vụ, Prisma ghi database, Redis giữ ghế tạm, SePay webhook xác nhận thanh toán.
