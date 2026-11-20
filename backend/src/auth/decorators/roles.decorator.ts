import { SetMetadata } from '@nestjs/common';
import { Role } from '@prisma/client';

export const ROLES_KEY = 'auth:roles';
// Khai báo các vai trò được phép; không thực hiện xác thực tại decorator.
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
