/**
 * Mục đích: Kiểm tra mã ưu đãi trước khi chuyển cho nghiệp vụ booking xử lý.
 */
import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MaxLength } from 'class-validator';

// Lớp ApplyBookingPromotionDto mô tả mã ưu đãi khách nhập tại trang thanh toán.
export class ApplyBookingPromotionDto {
  @ApiProperty({ example: 'UUDAI100' })
  @IsString()
  @MaxLength(50)
  @Matches(/^[A-Za-z0-9_-]+$/, {
    message: 'Mã ưu đãi chỉ được chứa chữ, số, gạch ngang hoặc gạch dưới',
  })
  code: string;
}
