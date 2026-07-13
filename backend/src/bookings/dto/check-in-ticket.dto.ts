/**
 * Mục đích: Định nghĩa dữ liệu đầu vào và các quy tắc kiểm tra cho miền đặt vé, thanh toán và vé điện tử.
 */
import { IsOptional, IsString } from 'class-validator';

// Lớp CheckInTicketDto mô tả cấu trúc dữ liệu đầu vào và kích hoạt validation.
export class CheckInTicketDto {
  @IsOptional()
  @IsString()
  checkedInBy?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
