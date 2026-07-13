import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash } from 'crypto';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StaffGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<{
      headers: { authorization?: string };
      user?: { id: string; role: Role };
    }>();
    const [scheme, token] = (request.headers.authorization || '').split(' ');
    if (scheme !== 'Bearer' || !token) {
      throw new UnauthorizedException('Vui lòng đăng nhập bằng tài khoản nhân viên');
    }
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const session = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });
    if (!session || session.revokedAt || session.expiresAt <= new Date() || !session.user.isActive) {
      throw new UnauthorizedException('Phiên đăng nhập đã hết hạn');
    }
    if (session.user.role !== Role.STAFF) {
      throw new ForbiddenException('Chỉ nhân viên được sử dụng chức năng chấm công');
    }
    request.user = session.user;
    return true;
  }
}
