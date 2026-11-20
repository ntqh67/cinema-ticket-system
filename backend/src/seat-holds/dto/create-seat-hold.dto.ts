/**
 * Mục đích: Định nghĩa dữ liệu đầu vào và các quy tắc kiểm tra cho miền giữ ghế tạm thời.
 */
import { IsNotEmpty, IsString } from 'class-validator';
import { GuestSessionDto } from './guest-session.dto';

// Lớp CreateSeatHoldDto mô tả cấu trúc dữ liệu đầu vào và kích hoạt validation.
export class CreateSeatHoldDto extends GuestSessionDto {
  @IsString()
  @IsNotEmpty()
  showtimeId: string;

  @IsString()
  @IsNotEmpty()
  showtimeSeatId: string;
}
