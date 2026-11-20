import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';
import type { AuthenticatedRequest } from '../types/authenticated-user.type';

@Injectable()
// Chỉ phân quyền trên danh tính do AuthGuard gắn vào request.
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  // Metadata phương thức được ưu tiên hơn metadata controller.
  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const { user } = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!user) throw new UnauthorizedException('Vui lòng đăng nhập');
    if (roles && !roles.includes(user.role))
      throw new ForbiddenException('Bạn không có quyền thực hiện thao tác này');
    return true;
  }
}
