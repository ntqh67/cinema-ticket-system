import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { AuthGuard } from './auth.guard';

@Injectable()
// Endpoint công khai vẫn xác thực nghiêm ngặt nếu client cung cấp Authorization.
export class OptionalAuthGuard implements CanActivate {
  constructor(private readonly authGuard: AuthGuard) {}

  // Chỉ thiếu header mới là guest; header rỗng hoặc token lỗi không được bỏ qua.
  canActivate(context: ExecutionContext): boolean | Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    if (request.headers.authorization === undefined) return true;
    return this.authGuard.canActivate(context);
  }
}
