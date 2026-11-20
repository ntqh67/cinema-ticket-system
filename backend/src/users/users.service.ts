import { Prisma } from '@prisma/client';
import { splitName, toPublicUser } from '../common/public-user';
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
// Cập nhật hồ sơ của danh tính đã được controller xác thực.
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  // Chỉ cho phép đổi tên và điện thoại; role và trạng thái không thuộc DTO này.
  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const { firstName, lastName } = splitName(dto.name);
    const user = await this.prisma.user
      .update({
        where: { id: userId },
        data: {
          firstName,
          lastName,
          phone: dto.phone?.trim() || null,
        },
      })
      .catch((error: unknown) => {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2025'
        ) {
          throw new NotFoundException('User not found');
        }
        throw error;
      });

    return { user: toPublicUser(user) };
  }
}
