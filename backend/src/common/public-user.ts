import { Role } from '@prisma/client';

// Tách họ tên nhất quán cho đăng ký, hồ sơ và quản lý nhân viên.
export function splitName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  // Kiểm tra số lượng phần tử để xử lý trường hợp rỗng hoặc vượt giới hạn.
  if (parts.length <= 1) {
    return {
      firstName: parts[0] || name.trim(),
      lastName: null,
    };
  }

  return {
    firstName: parts.slice(0, -1).join(' '),
    lastName: parts.at(-1) || null,
  };
}

// Chỉ xuất các trường công khai, giữ hợp đồng role của API hiện có.
export function toPublicUser(user: {
  id: string;
  username: string | null;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  role: Role;
  isActive: boolean;
  createdAt: Date;
}) {
  const name = [user.firstName, user.lastName].filter(Boolean).join(' ');

  return {
    id: user.id,
    backendUserId: user.id,
    email: user.email,
    username: user.username,
    name: name || user.email,
    phone: user.phone || '',
    role:
      user.role === Role.ADMIN
        ? 'admin'
        : user.role === Role.STAFF
          ? 'staff'
          : 'user',
    isActive: user.isActive,
    createdAt: user.createdAt,
  };
}
