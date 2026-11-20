import { Transform } from 'class-transformer';
import { Password } from './password.decorator';
/**
 * Mục đích: Định nghĩa dữ liệu đầu vào và các quy tắc kiểm tra cho miền xác thực người dùng.
 */
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

// Lớp RegisterDto mô tả cấu trúc dữ liệu đầu vào và kích hoạt validation.
export class RegisterDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(2)
  name!: string;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  email!: string;

  @Password()
  password!: string;

  @IsOptional()
  @IsString()
  phone?: string;
}
