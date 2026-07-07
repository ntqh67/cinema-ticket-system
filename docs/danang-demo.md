# Da Nang Cinema Demo Setup

Huong dan nay danh cho nguoi pull branch Quang Huy ve de demo database rap Da Nang, booking flow, seat hold Redis va Swagger API.

## Pull Branch

```powershell
git clone https://github.com/ntqh67/cinema-ticket-system.git
cd "cinema-ticket-system"
git checkout quang-huy-danang-booking-db
```

Neu da co repo local:

```powershell
cd "D:\My Project\Project 4 - Cinema"
git fetch origin
git checkout quang-huy-danang-booking-db
git pull origin quang-huy-danang-booking-db
```

## Start Database

```powershell
cd "D:\My Project\Project 4 - Cinema"
docker compose up -d
npm.cmd install
npx.cmd prisma migrate dev
npx.cmd prisma db seed
```

Seed se reset database va tao:

```text
9 rap Da Nang
45 phong chieu
8 phim NOW_SHOWING
lich chieu 7 ngay
gia VND
ghe VIP o cum trung tam
ghe doi o hang cuoi
```

## Run Backend

```powershell
cd "D:\My Project\Project 4 - Cinema\backend"
npm.cmd install
npm.cmd run start:dev
```

Backend:

```text
http://localhost:3000
```

Swagger:

```text
http://localhost:3000/api/docs
```

## Run Frontend

Mo terminal khac:

```powershell
cd "D:\My Project\Project 4 - Cinema\frontend"
npx.cmd vite --host 0.0.0.0
```

Frontend:

```text
http://localhost:5173
```

## Seed Accounts

```text
customer@cinema.test / DevCustomer123!
admin@cinema.test / DevAdmin123!
staff@cinema.test / DevStaff123!
hung@example.com / user123
```

## Demo Flow

1. Mo `http://localhost:5173`.
2. Vao danh sach phim dang chieu.
3. Chon phim va xem cac rap Da Nang: Galaxy, CGV, Rio, Metiz, Lotte, Le Do, Starlight.
4. Chon suat chieu bat ky.
5. Chua dang nhap van xem va chon ghe duoc.
6. Ghe duoc giu tam bang Redis trong 5 phut.
7. Bam `Tiep Tuc`, luc nay moi bat dang nhap.
8. Dang nhap bang `customer@cinema.test / DevCustomer123!`.
9. Thanh toan online demo.
10. Vao `Ve Cua Toi` de xem ve va QR.

## Database Checks

Mo Prisma Studio:

```powershell
cd "D:\My Project\Project 4 - Cinema"
npx.cmd prisma studio
```

Kiem tra:

```text
Cinema: 9 rap, city = Da Nang
Room: 45 phong
Movie: 8 phim NOW_SHOWING
Showtime: nhieu khung gio trong 7 ngay
ShowtimeSeat: AVAILABLE truoc khi thanh toan, BOOKED sau khi thanh toan
Booking/Payment: currency = VND
```

## Important Notes

- PostgreSQL la nguon du lieu chinh.
- Redis chi dung de giu ghe tam thoi voi TTL 5 phut.
- Khi chi moi chon ghe, `ShowtimeSeat.status` trong PostgreSQL van la `AVAILABLE`.
- Khi thanh toan thanh cong, ghe moi chuyen sang `BOOKED`.
- Chay `npx.cmd prisma db seed` se xoa booking/ve test cu va tao lai du lieu demo.
