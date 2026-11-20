import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
/**
 * Mục đích: Tiếp nhận HTTP cho miền xác thực và chuyển xử lý sang AuthService.
 * Các endpoint nhạy cảm có rate limit riêng (429 kèm Retry-After).
 */
import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { toPublicUser } from '../common/public-user';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { LoginDto } from './dto/login.dto';
import {
  ChangePasswordDto,
  ForgotPasswordDto,
  ResetPasswordDto,
} from './dto/password-flow.dto';
import { RefreshDto } from './dto/refresh.dto';
import { RegisterDto } from './dto/register.dto';
import { AuthGuard } from './guards/auth.guard';
import type {
  AuthenticatedRequest,
  AuthenticatedUser,
} from './types/authenticated-user.type';

// Hạn mức theo IP: 10 lần/phút cho đăng nhập/refresh, 5 lần/phút cho đăng ký và email.
const LOGIN_LIMIT = { default: { limit: 10, ttl: 60_000 } };
const SENSITIVE_LIMIT = { default: { limit: 5, ttl: 60_000 } };

@ApiTags('auth')
@ApiBearerAuth()
@Controller('auth')
@UseGuards(ThrottlerGuard)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @Throttle(SENSITIVE_LIMIT)
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @Throttle(LOGIN_LIMIT)
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  // Đổi cặp token bằng refresh token; token cũ bị tiêu.
  @Post('refresh')
  @HttpCode(200)
  @Throttle(LOGIN_LIMIT)
  refresh(@Body() dto: RefreshDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  // Trả hồ sơ của phiên hiện tại, không nhận userId từ client.
  @Get('me')
  @UseGuards(AuthGuard)
  me(@CurrentUser() user: AuthenticatedUser) {
    return { user: toPublicUser(user) };
  }

  // Thu hồi cả family của phiên đã vượt qua AuthGuard.
  @Post('logout')
  @UseGuards(AuthGuard)
  logout(@Req() request: AuthenticatedRequest) {
    return this.authService.logout(request.authSession.id);
  }

  // Logout khi access token đã hết hạn: chỉ cần refresh token.
  @Post('logout/refresh')
  @HttpCode(200)
  @Throttle(LOGIN_LIMIT)
  logoutWithRefresh(@Body() dto: RefreshDto) {
    return this.authService.logoutWithRefreshToken(dto.refreshToken);
  }

  @Post('change-password')
  @HttpCode(200)
  @UseGuards(AuthGuard)
  @Throttle(SENSITIVE_LIMIT)
  changePassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(user.id, dto);
  }

  @Post('forgot-password')
  @HttpCode(202)
  @Throttle(SENSITIVE_LIMIT)
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Post('reset-password')
  @HttpCode(200)
  @Throttle(SENSITIVE_LIMIT)
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }
}
