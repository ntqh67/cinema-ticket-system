import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from '../auth.service';
import type { AuthenticatedRequest } from '../types/authenticated-user.type';

@Injectable()
// Mọi miền dùng chung một đường xác thực bearer access token (JWT).
export class AuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  // Chỉ chấp nhận một bearer token, không bỏ qua phần dư của header.
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const match = /^Bearer ([\w-]+\.[\w-]+\.[\w-]+)$/.exec(
      request.headers.authorization || '',
    );
    if (!match) throw new UnauthorizedException('Vui lòng đăng nhập lại');
    const { user, sessionId } = await this.authService.authenticate(match[1]);
    request.user = user;
    request.authSession = { id: sessionId };
    return true;
  }
}
