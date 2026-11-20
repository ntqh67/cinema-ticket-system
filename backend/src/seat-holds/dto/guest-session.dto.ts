import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength, ValidateIf } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

// Dùng chung bằng chứng guest cho hold, seat map và chuyển quyền khi tạo booking.
export class GuestSessionDto {
  @ApiPropertyOptional({ maxLength: 128, description: 'Mã guest opaque ngẫu nhiên; bắt buộc khi guest giữ hoặc nhả ghế.' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  guestSessionId?: string;
}
