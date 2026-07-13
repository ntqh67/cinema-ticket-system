/**
 * Mục đích: Tiếp nhận yêu cầu HTTP cho miền xác thực người dùng và chuyển xử lý sang service.
 */
import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Controller('auth')
// Lớp AuthController nhận thao tác từ HTTP hoặc giao diện và chuyển chúng tới lớp nghiệp vụ phù hợp.
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  // Kiểm tra điều kiện nghiệp vụ trong khối register trước khi tiếp tục.
  register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  // Thực hiện trách nhiệm riêng của khối login.
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }
}
