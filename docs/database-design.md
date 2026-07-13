# STI-cinema-ticket-DN Database Design

Tai lieu nay mo ta database hien tai va huong phat trien database cho he thong dat ve xem phim tai Da Nang.

## 1. Muc Tieu Database

Database cua STI-cinema-ticket-DN can quan ly du lieu cot loi sau:

- Tai khoan nguoi dung, admin, nhan vien.
- Phim, the loai, review, thong tin import tu TMDB.
- Chuoi rap, rap, phong chieu, ghe.
- Suat chieu va trang thai tung ghe theo tung suat chieu.
- Booking, booking item, payment, ticket dien tu.
- QR ticket/booking va check-in tai rap.

PostgreSQL la nguon du lieu chinh. Redis chi dung cho giu ghe tam thoi trong vai phut.

## 2. Cong Nghe Database

- Database: PostgreSQL.
- ORM: Prisma.
- ID chinh: `String @default(cuid())`.
- Tien te: `Decimal(10, 2)`.
- Currency mac dinh: `VND`.
- Redis: giu ghe tam thoi bang TTL, khong phai source of truth.

## 3. Nhom Bang Chinh

### User And Auth

#### `users`

Luu tai khoan nguoi dung.

Vai tro hien tai:

- `CUSTOMER`: khach hang dat ve.
- `ADMIN`: quan tri he thong.
- `STAFF`: nhan vien rap/check-in.

Cot quan trong:

- `email`: duy nhat.
- `passwordHash`: mat khau da hash bang bcrypt.
- `role`: phan quyen.
- `isActive`: khoa/mo tai khoan.

#### `refresh_tokens`

Da co model de ho tro refresh token, nhung auth hien tai chua phat hanh JWT/session that.

Khi lam auth that:

- Luu hash refresh token vao `refresh_tokens`.
- Thu hoi token bang `revokedAt`.
- Xoa/vo hieu hoa token het han bang `expiresAt`.

### Movie Catalog

#### `movies`

Luu thong tin phim:

- `tmdbId`
- `title`
- `description`
- `posterUrl`
- `trailerUrl`
- `durationMin`
- `releaseDate`
- `status`

Trang thai phim:

- `DRAFT`
- `NOW_SHOWING`
- `COMING_SOON`
- `ENDED`

#### `genres`

Luu danh muc the loai phim.

#### `movie_genres`

Bang trung gian many-to-many giua phim va the loai.

#### `movie_reviews`

Nguoi dung danh gia phim sau khi da mua ve thanh cong.

Rule nen giu:

- Mot user chi co mot review cho moi phim.
- Chi user co booking `PAID` cua phim do moi duoc review.

### Cinema Structure

#### `cinema_chains`

Luu chuoi rap, vi du:

- CGV
- Galaxy
- Lotte
- Metiz
- Starlight
- Rio
- Le Do

`@@unique([name, city])` giup cung mot thanh pho khong bi trung chuoi rap.

#### `cinemas`

Luu tung rap cu the tai Da Nang.

Vi du:

- CGV Vincom Da Nang.
- Galaxy Da Nang.
- Metiz Cinema.

Moi cinema co the thuoc mot `cinema_chain`.

#### `cinema_seat_prices`

Luu bang gia rieng cua tung rap theo loai ghe.

Moi rap nen co 3 dong gia:

- `STANDARD`
- `VIP`
- `COUPLE`

Rule:

- Unique theo `cinemaId + seatType`.
- Khi tao suat chieu, backend lay gia tu bang nay de gan vao `showtime_seats.price`.
- `showtime_seats.price` van duoc giu lai de chot gia theo tung suat chieu.
- `booking_items.unitPrice` van duoc giu lai de chot gia tai thoi diem khach dat ve.
- Neu mot rap chua co cau hinh gia, backend fallback ve gia mac dinh.

#### `rooms`

Luu phong chieu cua tung rap.

Rule:

- Ten phong khong duoc trung trong cung mot rap.
- `capacity` nen bang so ghe thuc te cua phong.

#### `seats`

Luu layout ghe co dinh cua phong.

Loai ghe:

- `STANDARD`
- `VIP`
- `COUPLE`

Rule:

- Ghe unique theo `roomId + row + number`.
- Ghe la layout vat ly, chua phai trang thai ghe cua mot suat chieu.

### Showtime And Seat State

#### `showtimes`

Luu suat chieu cua mot phim trong mot phong.

Cot quan trong:

- `movieId`
- `roomId`
- `startAt`
- `endAt`
- `basePrice`

Rule:

- `startAt` phai nho hon `endAt`.
- Khong duoc trung lich trong cung mot phong.
- Nen co buffer don phong, hien tai service dung 30 phut.

#### `showtime_seats`

Luu trang thai ghe theo tung suat chieu.

Day la bang rat quan trong trong booking.

Moi record = 1 ghe vat ly trong 1 suat chieu.

Trang thai:

- `AVAILABLE`: co the dat.
- `HELD`: co enum trong DB, nhung thiet ke hien tai khong nen ghi hold tam vao PostgreSQL.
- `BOOKED`: da dat thanh cong sau payment.
- `BLOCKED`: bi khoa.

Rule hien tai:

- Redis giu ghe tam thoi.
- Khi ghe chi dang hold, `showtime_seats.status` van la `AVAILABLE`.
- API ghe se merge DB status voi Redis hold de tra ve `HELD`.
- Khi thanh toan thanh cong, DB moi update sang `BOOKED`.

### Booking And Payment

#### `bookings`

Luu don dat ve.

Trang thai:

- `PENDING`: vua tao, chua thanh toan.
- `PAID`: da thanh toan.
- `CANCELLED`: da huy.
- `EXPIRED`: het han.
- `REFUNDED`: da hoan tien.

Cot quan trong:

- `userId`
- `showtimeId`
- `totalAmount`
- `currency`
- `expiresAt`

Rule:

- Booking tao sau khi user da hold ghe hop le.
- Booking pending phai co thoi han.
- Booking het han khong duoc thanh toan.

#### `booking_items`

Luu tung ghe trong booking.

Moi item gan voi mot `showtimeSeatId`.

Rule:

- Gia ghe tai thoi diem dat ve duoc luu vao `unitPrice`.
- Khong tinh lai gia tu showtime seat khi hien thi ve cu.

#### `payments`

Luu giao dich thanh toan.

Trang thai:

- `PENDING`
- `SUCCESS`
- `FAILED`
- `CANCELLED`
- `REFUNDED`

Provider co the la:

- `mock`
- `vnpay`
- `vnpay-demo`
- `momo-demo`
- `zalopay-demo`
- `card-demo`

Rule:

- Xac nhan payment phai nam trong transaction voi booking, seats, tickets.
- Khi lam payment that, callback phai verify chu ky va xu ly idempotency.

### Ticket And Check-in

#### `tickets`

Luu ve dien tu sau khi booking da thanh toan.

Moi booking item nen co mot ticket.

Cot quan trong:

- `bookingId`
- `bookingItemId`
- `qrToken`
- `status`
- `issuedAt`
- `expiresAt`

Trang thai:

- `VALID`
- `USED`
- `CANCELLED`
- `EXPIRED`

#### `ticket_check_ins`

Luu lich su check-in ve.

Rule:

- Moi ticket chi check-in mot lan.
- Check-in la tac vu cua staff/admin.

## 4. Quan He Chinh

```text
User 1 - n Booking
User 1 - n RefreshToken
User 1 - n MovieReview

Movie n - n Genre qua MovieGenre
Movie 1 - n Showtime
Movie 1 - n MovieReview

CinemaChain 1 - n Cinema
Cinema 1 - n Room
Cinema 1 - n CinemaSeatPrice
Room 1 - n Seat
Room 1 - n Showtime

Showtime 1 - n ShowtimeSeat
Seat 1 - n ShowtimeSeat

Booking 1 - n BookingItem
Booking 1 - n Payment
Booking 1 - n Ticket

BookingItem 1 - 1 Ticket
ShowtimeSeat 1 - n BookingItem

Ticket 1 - 0..1 TicketCheckIn
```

## 5. Booking Transaction Can Nho

Khi tao booking:

1. Kiem tra user ton tai.
2. Kiem tra showtime ton tai.
3. Kiem tra cac `showtimeSeatIds` thuoc dung showtime.
4. Kiem tra DB status van la `AVAILABLE`.
5. Kiem tra Redis hold thuoc dung session/user.
6. Tao booking `PENDING`.
7. Tao booking items.

Khi payment thanh cong:

1. Kiem tra booking `PENDING`.
2. Kiem tra booking chua het han.
3. Kiem tra ghe van hop le.
4. Update `showtime_seats` sang `BOOKED`.
5. Tao/update payment `SUCCESS`.
6. Update booking sang `PAID`.
7. Tao tickets.
8. Xoa Redis holds.

Tat ca cac buoc update DB quan trong phai nam trong Prisma transaction.

## 6. Redis Seat Hold Design

Key nen dung:

```text
seat_hold:{showtimeId}:{showtimeSeatId}
```

Payload nen co:

```json
{
  "showtimeId": "string",
  "showtimeSeatId": "string",
  "sessionId": "string",
  "userId": "string | optional",
  "expiresAt": "ISO date"
}
```

TTL hien tai: 5 phut.

Khong nen tao bang PostgreSQL rieng cho hold tam thoi neu muc tieu chi la chong dat trung ngan han.

## 7. Diem Database Da On

Schema hien tai da co nen tot:

- Tach `Seat` va `ShowtimeSeat` dung cach.
- Co `Booking`, `BookingItem`, `Payment`, `Ticket`.
- Co `CinemaChain`, phu hop voi bai toan nhieu chuoi rap tai Da Nang.
- Co `MovieReview` va constraint mot user review mot phim.
- Co `CinemaSeatPrice` de moi rap co bang gia rieng theo loai ghe.
- Co index cho movie status, showtime, booking status, seat status.
- Dung Decimal cho tien.
- Dung transaction trong booking/payment service.

## 8. Diem Nen Cai Thien Tiep

### Uu tien cao

1. Them JWT/session flow thuc su dua tren `refresh_tokens`.
2. Them AuthGuard va RoleGuard de bao ve admin/staff API.
3. Them idempotency cho payment callback.
4. Them unique/index cho `payments.providerRef` neu providerRef duoc dung de lookup callback.
5. Them constraint/rule kiem tra rating trong khoang 1-5 hoac 1-10.

### Uu tien vua

1. Them thong tin dia ly cho rap:
   - `district`
   - `latitude`
   - `longitude`
2. Them dinh dang suat chieu:
   - `format`: 2D, 3D, IMAX, 4DX
   - `language`: phu de, long tieng
3. Them audit fields cho tac vu admin neu can:
   - `createdBy`
   - `updatedBy`
4. Them bang promotion/coupon neu muon lam khuyen mai that.

### Uu tien sau

1. Them refund records neu lam hoan tien that.
2. Them notification records neu gui email/SMS.
3. Them cinema manager role neu moi rap co quan tri rieng.

## 9. Nguyen Tac Khi Sua Database

Khi can thay doi database:

1. Sua `prisma/schema.prisma`.
2. Chay `npx prisma format`.
3. Chay `npx prisma validate`.
4. Tao migration bang `npx prisma migrate dev --name ten_migration`.
5. Cap nhat seed neu schema moi can data demo.
6. Cap nhat service/controller lien quan.
7. Kiem tra luong demo: phim -> suat chieu -> ghe -> booking -> payment -> ticket.

## 10. Ket Luan

Database hien tai phu hop voi kien truc modular monolith cua STI-cinema-ticket-DN.

Huong dung tiep theo khong phai la doi database, ma la hoan thien cac lop bao ve va nghiep vu:

- Auth/role guard.
- Payment idempotency.
- Realtime seat updates.
- Ket noi frontend admin voi API that.
- Bo sung du lieu rap Da Nang chi tiet hon.
