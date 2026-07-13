/**
 * Mục đích: Định nghĩa dữ liệu đầu vào và các quy tắc kiểm tra cho miền đặt vé, thanh toán và vé điện tử.
 */
import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsInt, IsString, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

// Lớp BookingComboSelectionDto mô tả cấu trúc dữ liệu đầu vào và kích hoạt validation.
export class BookingComboSelectionDto {
  @ApiProperty()
  @IsString()
  comboId: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  quantity: number;
}

// Lớp UpdateBookingCombosDto mô tả cấu trúc dữ liệu đầu vào và kích hoạt validation.
export class UpdateBookingCombosDto {
  @ApiProperty({ type: [BookingComboSelectionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BookingComboSelectionDto)
  items: BookingComboSelectionDto[];
}
