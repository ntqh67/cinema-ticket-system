/**
 * Mục đích: Cài đặt nghiệp vụ xác thực người dùng; dữ liệu bền vững được truy cập qua Prisma.
 */
import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
// Lớp AuthService tập trung các quy tắc nghiệp vụ và phối hợp truy cập dữ liệu.
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  // Kiểm tra điều kiện nghiệp vụ trong khối register trước khi tiếp tục.
  async register(registerDto: RegisterDto) {
    const email = registerDto.email.trim().toLowerCase();
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    // Kiểm tra danh tính hoặc quyền sở hữu trước khi thao tác trên dữ liệu.
    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    const { firstName, lastName } = this.splitName(registerDto.name);
    const passwordHash = await bcrypt.hash(registerDto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName,
        lastName,
        phone: registerDto.phone?.trim() || null,
        role: Role.CUSTOMER,
      },
    });

    return {
      user: this.toPublicUser(user),
    };
  }

  // Thực hiện trách nhiệm riêng của khối login.
  async login(loginDto: LoginDto) {
    const identifier = loginDto.identifier.trim().toLowerCase();
    const user = await this.prisma.user.findFirst({
      where: { OR: [{ username: identifier }, { email: identifier }] },
    });

    // Kiểm tra danh tính hoặc quyền sở hữu trước khi thao tác trên dữ liệu.
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid username/email or password');
    }

    const validPassword = await bcrypt.compare(
      loginDto.password,
      user.passwordHash,
    );

    // Chặn luồng hiện tại khi dữ liệu hoặc điều kiện bắt buộc chưa được đáp ứng.
    if (!validPassword) {
      throw new UnauthorizedException('Invalid username/email or password');
    }

    return {
      user: this.toPublicUser(user),
    };
  }

  // Chuẩn hóa dữ liệu đầu vào/đầu ra trong khối splitName.
  private splitName(name: string) {
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

  // Thực hiện trách nhiệm riêng của khối toPublicUser.
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
      role: user.role === Role.ADMIN ? 'admin' : 'user',
      isActive: user.isActive,
      createdAt: user.createdAt,
    };
  }
}
