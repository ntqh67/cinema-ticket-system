import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { Password } from './password.decorator';

// Đổi mật khẩu khi đang đăng nhập.
export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty()
  currentPassword!: string;

  @Password()
  newPassword!: string;
}

// Yêu cầu gửi email đặt lại mật khẩu.
export class ForgotPasswordDto {
  @IsEmail()
  email!: string;
}

// Xác nhận đặt lại mật khẩu bằng token trong email.
export class ResetPasswordDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  token!: string;

  @Password()
  newPassword!: string;
}
