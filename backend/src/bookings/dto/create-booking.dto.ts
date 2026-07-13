/**
 * Mục đích: Định nghĩa dữ liệu đầu vào và các quy tắc kiểm tra cho miền đặt vé, thanh toán và vé điện tử.
 */
import { ArrayNotEmpty, IsArray, IsString } from 'class-validator';

// Lớp CreateBookingDto mô tả cấu trúc dữ liệu đầu vào và kích hoạt validation.
export class CreateBookingDto {
  @IsString()
  userId: string;

  @IsString()
  showtimeId: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  showtimeSeatIds: string[];

  @IsString()
  sessionId: string;
}
