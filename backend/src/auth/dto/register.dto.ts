/**
 * Mục đích: Định nghĩa dữ liệu đầu vào và các quy tắc kiểm tra cho miền xác thực người dùng.
 */
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

// Lớp RegisterDto mô tả cấu trúc dữ liệu đầu vào và kích hoạt validation.
export class RegisterDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsOptional()
  @IsString()
  phone?: string;
}
