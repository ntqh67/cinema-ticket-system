# ERD

> Tự sinh từ `prisma/schema.prisma` bằng `node scripts/generate-erd.js`. Chỉ hiển thị khóa chính (PK), khóa ngoại (FK) và cột duy nhất (UK); danh sách cột đầy đủ xem [database-schema-excel.csv](database-schema-excel.csv).

```mermaid
erDiagram
  User ||--o{ StaffAttendance : "staffId"
  User ||--o{ AuthSession : "userId"
  AuthSession ||--o{ RefreshToken : "sessionId"
  User ||--o{ PasswordResetToken : "userId"
  User ||--o{ MovieReview : "userId"
  Movie ||--o{ MovieReview : "movieId"
  Movie ||--o{ MovieGenre : "movieId"
  Genre ||--o{ MovieGenre : "genreId"
  CinemaChain |o--o{ Cinema : "chainId"
  Cinema ||--o{ CinemaTicketPrice : "cinemaId"
  Cinema ||--o{ Room : "cinemaId"
  Room ||--o{ Seat : "roomId"
  Movie ||--o{ Showtime : "movieId"
  Room ||--o{ Showtime : "roomId"
  Showtime ||--o{ ShowtimeSeat : "showtimeId"
  Seat ||--o{ ShowtimeSeat : "seatId"
  User ||--o{ Booking : "userId"
  Showtime ||--o{ Booking : "showtimeId"
  Booking ||--o| BookingPromotion : "bookingId"
  Promotion ||--o{ BookingPromotion : "promotionId"
  Booking ||--o{ BookingComboItem : "bookingId"
  ConcessionCombo ||--o{ BookingComboItem : "comboId"
  Booking ||--o{ BookingItem : "bookingId"
  ShowtimeSeat ||--o{ BookingItem : "showtimeSeatId"
  Booking ||--o{ Payment : "bookingId"
  Booking ||--o{ Ticket : "bookingId"
  BookingItem ||--o{ Ticket : "bookingItemId"
  Ticket ||--o| TicketCheckIn : "ticketId"
  User {
    String id PK
    String username UK
    String email UK
  }
  StaffAttendance {
    String id PK
    String staffId FK
  }
  AuthSession {
    String id PK
    String userId FK
  }
  RefreshToken {
    String id PK
    String sessionId FK
    String tokenHash UK
  }
  PasswordResetToken {
    String id PK
    String userId FK
    String tokenHash UK
  }
  Movie {
    String id PK
  }
  MovieReview {
    String id PK
    String userId FK
    String movieId FK
  }
  Genre {
    String id PK
    String name UK
  }
  MovieGenre {
    String movieId FK
    String genreId FK
  }
  CinemaChain {
    String id PK
  }
  Cinema {
    String id PK
    String chainId FK
    String code UK
  }
  CinemaTicketPrice {
    String id PK
    String cinemaId FK
  }
  Room {
    String id PK
    String cinemaId FK
  }
  Seat {
    String id PK
    String roomId FK
  }
  Showtime {
    String id PK
    String movieId FK
    String roomId FK
  }
  ShowtimeSeat {
    String id PK
    String showtimeId FK
    String seatId FK
  }
  Booking {
    String id PK
    String userId FK
    String showtimeId FK
  }
  Promotion {
    String id PK
    String code UK
  }
  BookingPromotion {
    String id PK
    String bookingId FK
    String promotionId FK
  }
  ConcessionCombo {
    String id PK
  }
  BookingComboItem {
    String id PK
    String bookingId FK
    String comboId FK
  }
  BookingItem {
    String id PK
    String bookingId FK
    String showtimeSeatId FK
  }
  Payment {
    String id PK
    String bookingId FK
    String providerTransactionId UK
  }
  PaymentWebhookEvent {
    String id PK
  }
  Ticket {
    String id PK
    String bookingId FK
    String bookingItemId FK
    String qrToken UK
  }
  TicketCheckIn {
    String id PK
    String ticketId FK
  }
```
