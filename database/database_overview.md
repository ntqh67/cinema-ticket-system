# T?ng quan database Cinema Ticket System

Xu?t l?c: 17:54:50 13/7/2026

## K?t n?i
- Database ch?nh: PostgreSQL theo `DATABASE_URL` trong `.env`
- Redis ch? d?ng gi? gh? t?m th?i b?ng TTL, kh?ng ph?i d? li?u ch?nh th?c

## S? l??ng b?n ghi
| Nh?m | S? l??ng |
| --- | ---: |
| Users | 4 |
| Refresh tokens | 0 |
| Movies | 14 |
| Movie reviews | 1 |
| Genres | 14 |
| Movie genres | 36 |
| Cinema chains | 1 |
| Cinemas / chi nh?nh | 7 |
| Cinema ticket prices | 21 |
| Rooms | 35 |
| Seats | 3618 |
| Showtimes | 779 |
| Showtime seats | 80387 |
| Bookings | 4 |
| Concession combos | 4 |
| Booking combo items | 0 |
| Booking items | 15 |
| Payments | 3 |
| Tickets | 11 |
| Ticket check-ins | 0 |

Doanh thu thanh to?n th?nh c?ng: **1.375.000 VND**

## Phim theo tr?ng th?i
| Tr?ng th?i | S? l??ng |
| --- | ---: |
| NOW_SHOWING | 8 |
| COMING_SOON | 6 |

## Booking theo tr?ng th?i
| Tr?ng th?i | S? l??ng |
| --- | ---: |
| PENDING | 1 |
| PAID | 3 |

## Payment theo tr?ng th?i
| Tr?ng th?i | S? l??ng |
| --- | ---: |
| SUCCESS | 3 |

## Ticket theo tr?ng th?i
| Tr?ng th?i | S? l??ng |
| --- | ---: |
| VALID | 11 |

## Gh? theo lo?i
| Tr?ng th?i | S? l??ng |
| --- | ---: |
| STANDARD | 2883 |
| VIP | 525 |
| COUPLE | 210 |

## Gh? theo tr?ng th?i su?t chi?u
| Tr?ng th?i | S? l??ng |
| --- | ---: |
| AVAILABLE | 80376 |
| BOOKED | 11 |

## R?p / chi nh?nh
| M? | Chi nh?nh | Ph??ng/Qu?n | Th?nh ph? | Ph?ng | Gh? | Su?t chi?u | Gi? STANDARD/VIP/COUPLE |
| --- | --- | --- | --- | ---: | ---: | ---: | --- |
| CR01 | CR Cinema Riverside | Hải Châu | Đà Nẵng | 7 | 722 | 155 | STANDARD: 85.000 VND<br>VIP: 125.000 VND<br>COUPLE: 200.000 VND |
| CR02 | CR Cinema Central Park | Thanh Khê | Đà Nẵng | 7 | 722 | 156 | STANDARD: 85.000 VND<br>VIP: 125.000 VND<br>COUPLE: 200.000 VND |
| CR03 | CR Cinema Ocean View | Sơn Trà | Đà Nẵng | 5 | 518 | 111 | STANDARD: 85.000 VND<br>VIP: 125.000 VND<br>COUPLE: 200.000 VND |
| CR04 | CR Cinema Marble Mountain | Ngũ Hành Sơn | Đà Nẵng | 5 | 518 | 111 | STANDARD: 85.000 VND<br>VIP: 125.000 VND<br>COUPLE: 200.000 VND |
| CR05 | CR Cinema Northwest | Liên Chiểu | Đà Nẵng | 5 | 518 | 111 | STANDARD: 85.000 VND<br>VIP: 125.000 VND<br>COUPLE: 200.000 VND |
| CR06 | CR Cinema Green Square | Cẩm Lệ | Đà Nẵng | 3 | 310 | 70 | STANDARD: 85.000 VND<br>VIP: 125.000 VND<br>COUPLE: 200.000 VND |
| CR07 | CR Cinema Golden Hills | Hòa Vang | Đà Nẵng | 3 | 310 | 65 | STANDARD: 85.000 VND<br>VIP: 125.000 VND<br>COUPLE: 200.000 VND |

## Phim
| Phim | Tr?ng th?i | Ph?n lo?i tu?i | Th?i l??ng | Th? lo?i | Su?t chi?u | Review | Trailer |
| --- | --- | --- | ---: | --- | ---: | ---: | --- |
| 28 Years Later | NOW_SHOWING | C18 | 115 ph?t | Kinh Dị, Giật Gân | 150 | 0 | C? |
| Doraemon: Nobita va The Gioi Trong Tranh | NOW_SHOWING | P | 105 ph?t | Phiêu Lưu, Hoạt Hình, Gia Đình | 145 | 1 | C? |
| F1: The Movie | NOW_SHOWING | C13 | 155 ph?t | Hành Động, Chính Kịch | 152 | 0 | C? |
| How to Train Your Dragon | NOW_SHOWING | P | 125 ph?t | Phiêu Lưu, Gia Đình, Giả Tưởng | 143 | 0 | C? |
| Jurassic World: Rebirth | NOW_SHOWING | C13 | 134 ph?t | Hành Động, Phiêu Lưu, Khoa Học Viễn Tưởng | 31 | 0 | C? |
| Lầu Chú Hỏa | NOW_SHOWING | C18 | 94 ph?t | Kinh Dị, Giật Gân | 2 | 0 | C? |
| Superman | NOW_SHOWING | C13 | 129 ph?t | Hành Động, Phiêu Lưu, Giả Tưởng | 154 | 0 | C? |
| Thỏ Ơi!! | NOW_SHOWING | P | 127 ph?t | Phim Lãng Mạn, Phim Chính Kịch, Giật Gân | 2 | 0 | C? |
| Ám Ảnh | COMING_SOON | C18 | 108 ph?t | Giật Gân, Kinh Dị | 0 | 0 | C? |
| Đêm Truy Sát | COMING_SOON | P | 90 ph?t | Giật Gân, Hành Động | 0 | 0 | C? |
| Huyết Ngải Ái Tình | COMING_SOON | P | 100 ph?t | Kinh Dị | 0 | 0 | Ch?a c? |
| Người Nhện: Khởi Đầu Mới | COMING_SOON | P | 150 ph?t | Hành Động, Khoa Học Viễn Tưởng, Phiêu Lưu | 0 | 0 | C? |
| Thám Tử Lừng Danh Conan: Thiên Thần Sa Ngã Trên Xa Lộ | COMING_SOON | P | 109 ph?t | Bí Ẩn, Hành Động, Tội Phạm, Hoạt Hình | 0 | 0 | C? |
| The Odyssey | COMING_SOON | P | 173 ph?t | Giả Tưởng, Hành Động, Phiêu Lưu | 0 | 0 | C? |

## Th? lo?i
| Th? lo?i | S? phim |
| --- | ---: |
| Bí Ẩn | 1 |
| Chính Kịch | 1 |
| Gia Đình | 2 |
| Giật Gân | 5 |
| Giả Tưởng | 3 |
| Hài | 0 |
| Hành Động | 7 |
| Hoạt Hình | 2 |
| Khoa Học Viễn Tưởng | 2 |
| Kinh Dị | 4 |
| Phiêu Lưu | 6 |
| Phim Chính Kịch | 1 |
| Phim Lãng Mạn | 1 |
| Tội Phạm | 1 |

## Combo b?p n??c
| Combo | Gi? | Tr?ng th?i |
| --- | ---: | --- |
| Combo Couple | 129.000 VND | ?ang b?n |
| Combo Family | 229.000 VND | ?ang b?n |
| Combo Solo | 79.000 VND | ?ang b?n |
| Nuoc Ngot | 35.000 VND | ?ang b?n |

## 15 su?t chi?u s?p t?i
| Phim | R?p | Ph?ng | B?t ??u | K?t th?c | T?ng gh? |
| --- | --- | --- | --- | --- | ---: |
| How to Train Your Dragon | CR02 - CR Cinema Central Park | Screen 2 - Large | 18:15:00 13/7/2026 | 20:20:00 13/7/2026 | 133 |
| Superman | CR02 - CR Cinema Central Park | Screen 7 - Standard | 18:15:00 13/7/2026 | 20:24:00 13/7/2026 | 102 |
| 28 Years Later | CR05 - CR Cinema Northwest | Screen 5 - Small | 18:15:00 13/7/2026 | 20:10:00 13/7/2026 | 75 |
| Doraemon: Nobita va The Gioi Trong Tranh | CR07 - CR Cinema Golden Hills | Screen 2 - Standard | 18:15:00 13/7/2026 | 20:00:00 13/7/2026 | 102 |
| 28 Years Later | CR01 - CR Cinema Riverside | Screen 5 - Large | 18:45:00 13/7/2026 | 20:40:00 13/7/2026 | 133 |
| Doraemon: Nobita va The Gioi Trong Tranh | CR02 - CR Cinema Central Park | Screen 3 - Small | 18:45:00 13/7/2026 | 20:30:00 13/7/2026 | 75 |
| F1: The Movie | CR03 - CR Cinema Ocean View | Screen 1 - Large | 18:45:00 13/7/2026 | 21:20:00 13/7/2026 | 133 |
| How to Train Your Dragon | CR05 - CR Cinema Northwest | Screen 1 - Large | 18:45:00 13/7/2026 | 20:50:00 13/7/2026 | 133 |
| Superman | CR06 - CR Cinema Green Square | Screen 1 - Small | 18:45:00 13/7/2026 | 20:54:00 13/7/2026 | 75 |
| F1: The Movie | CR01 - CR Cinema Riverside | Screen 6 - Small | 19:30:00 13/7/2026 | 22:05:00 13/7/2026 | 75 |
| Superman | CR04 - CR Cinema Marble Mountain | Screen 2 - Small | 19:30:00 13/7/2026 | 21:39:00 13/7/2026 | 75 |
| 28 Years Later | CR02 - CR Cinema Central Park | Screen 5 - Large | 20:00:00 13/7/2026 | 21:55:00 13/7/2026 | 133 |
| Doraemon: Nobita va The Gioi Trong Tranh | CR03 - CR Cinema Ocean View | Screen 3 - Standard | 20:00:00 13/7/2026 | 21:45:00 13/7/2026 | 102 |
| How to Train Your Dragon | CR06 - CR Cinema Green Square | Screen 3 - Large | 20:00:00 13/7/2026 | 22:05:00 13/7/2026 | 133 |
| How to Train Your Dragon | CR02 - CR Cinema Central Park | Screen 1 - Standard | 20:30:00 13/7/2026 | 22:35:00 13/7/2026 | 102 |

## Ghi ch? nghi?p v?
- M?t r?p ch?nh/brand hi?n t?i l? `CR Cinema`, c?c record `Cinema` l? chi nh?nh.
- `Room` thu?c chi nh?nh c? th?, `Seat` thu?c ph?ng, `Showtime` thu?c phim + ph?ng.
- `ShowtimeSeat` l?u tr?ng th?i gh? theo t?ng su?t chi?u v? gi? cu?i c?ng c?a t?ng gh?.
- `Booking.totalAmount` g?m ti?n gh? + combo b?p n??c n?u c?.
- Th?i gian d?n ph?ng hi?n d?ng logic 30 ph?t trong Admin khi t?o l?ch chi?u.