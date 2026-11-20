/**
 * Mục đích: Định nghĩa dữ liệu đầu vào và các quy tắc kiểm tra cho miền đặt vé, thanh toán và vé điện tử.
 */
import { ArrayNotEmpty, IsArray, IsString } from 'class-validator';
import { GuestSessionDto } from '../../seat-holds/dto/guest-session.dto';

// Lớp CreateBookingDto mô tả cấu trúc dữ liệu đầu vào và kích hoạt validation.
export class CreateBookingDto extends GuestSessionDto {
  @IsString()
  showtimeId: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  showtimeSeatIds: string[];

}
