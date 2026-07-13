import { Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const { firstName, lastName } = this.splitName(dto.name);
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        firstName,
        lastName,
        phone: dto.phone?.trim() || null,
      },
    }).catch(() => null);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return { user: this.toPublicUser(user) };
  }

  private splitName(name: string) {
    const parts = name.trim().split(/\s+/).filter(Boolean);
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

  private toPublicUser(user: {
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
}
