import type { Request } from 'express';
import type { User } from '@prisma/client';

// Danh tính nội bộ chỉ chứa các trường an toàn; role giữ enum cho authorization.
export type AuthenticatedUser = Omit<User, 'passwordHash' | 'updatedAt'>;
export type AuthenticatedRequest = Request & {
  user: AuthenticatedUser;
  authSession: { id: string };
};
