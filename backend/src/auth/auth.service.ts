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
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async register(registerDto: RegisterDto) {
    const email = registerDto.email.trim().toLowerCase();
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

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
        role: Role.CUSTOMER,
      },
    });

    return {
      user: this.toPublicUser(user),
    };
  }

  async login(loginDto: LoginDto) {
    const identifier = loginDto.identifier.trim().toLowerCase();
    const user = await this.prisma.user.findFirst({
      where: { OR: [{ username: identifier }, { email: identifier }] },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid username/email or password');
    }

    const validPassword = await bcrypt.compare(
      loginDto.password,
      user.passwordHash,
    );

    if (!validPassword) {
      throw new UnauthorizedException('Invalid username/email or password');
    }

    return {
      user: this.toPublicUser(user),
    };
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
      role: user.role === Role.ADMIN ? 'admin' : 'user',
      isActive: user.isActive,
      createdAt: user.createdAt,
    };
  }
}
