import { Password } from './password.decorator';
/**
 * Mục đích: Định nghĩa dữ liệu đầu vào và các quy tắc kiểm tra cho miền xác thực người dùng.
 */
import { IsString, IsNotEmpty } from 'class-validator';

// Lớp LoginDto mô tả cấu trúc dữ liệu đầu vào và kích hoạt validation.
export class LoginDto {
  @IsString()
  @IsNotEmpty()
  identifier!: string;

  @Password()
  password!: string;
}
