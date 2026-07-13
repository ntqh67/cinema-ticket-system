/**
 * Mục đích: Định nghĩa dữ liệu đầu vào và các quy tắc kiểm tra cho miền giữ ghế tạm thời.
 */
import { IsOptional, IsString } from 'class-validator';

// Lớp CreateSeatHoldDto mô tả cấu trúc dữ liệu đầu vào và kích hoạt validation.
export class CreateSeatHoldDto {
  @IsString()
  showtimeId: string;

  @IsString()
  showtimeSeatId: string;

  @IsString()
  sessionId: string;

  @IsOptional()
  @IsString()
  userId?: string;
}
