/**
 * Mục đích: Phát hành/kiểm tra access token JWT và sinh refresh token ngẫu nhiên.
 * Chỉ xử lý mật mã; việc lưu trữ và thu hồi thuộc AuthService.
 */
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { sign, verify } from 'jsonwebtoken';
import { createHash, randomBytes } from 'crypto';
import {
  ACCESS_TTL_SECONDS_DEFAULT,
  JWT_SECRET_MIN_LENGTH,
  REFRESH_TTL_DAYS_DEFAULT,
} from './auth.constants';

export type AccessClaims = {
  sub: string;
  sid: string;
  authVersion: number;
  role: string;
};

@Injectable()
export class TokenService {
  private readonly secret: string;
  readonly accessTtlSeconds: number;
  readonly refreshTtlMs: number;

  constructor(config: ConfigService) {
    const secret = config.get<string>('JWT_ACCESS_SECRET') ?? '';
    // Thiếu khóa ký thì không cho khởi động, tránh chạy với token đoán được.
    if (secret.length < JWT_SECRET_MIN_LENGTH) {
      throw new Error(
        `JWT_ACCESS_SECRET phải có tối thiểu ${JWT_SECRET_MIN_LENGTH} ký tự`,
      );
    }
    this.secret = secret;
    this.accessTtlSeconds = Number(
      config.get('JWT_ACCESS_TTL_SECONDS') ?? ACCESS_TTL_SECONDS_DEFAULT,
    );
    this.refreshTtlMs =
      Number(config.get('REFRESH_TTL_DAYS') ?? REFRESH_TTL_DAYS_DEFAULT) *
      24 *
      60 *
      60 *
      1000;
  }

  // Ký access token ngắn hạn mang sid và authVersion để thu hồi tức thì.
  signAccess(claims: AccessClaims): string {
    return sign(claims, this.secret, {
      algorithm: 'HS256',
      expiresIn: this.accessTtlSeconds,
      jwtid: randomBytes(8).toString('hex'),
    });
  }

  // Chỉ chấp nhận HS256; chữ ký hoặc hạn sai đều là 401.
  verifyAccess(token: string): AccessClaims {
    try {
      return verify(token, this.secret, {
        algorithms: ['HS256'],
      }) as AccessClaims;
    } catch {
      throw new UnauthorizedException('Phiên đăng nhập không hợp lệ');
    }
  }

  // Token ngẫu nhiên 256 bit dạng base64url; raw token chỉ trả về client/email.
  newOpaqueToken(): string {
    return randomBytes(32).toString('base64url');
  }

  // Hash dùng chung khi phát hành và tra cứu; DB không bao giờ lưu raw token.
  hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
