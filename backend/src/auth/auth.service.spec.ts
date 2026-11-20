/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument, @typescript-eslint/require-await */
// Fixture Prisma/Jest chỉ mô phỏng các delegate cần thiết; kiểu production vẫn được kiểm tra đầy đủ.
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { AuthService } from './auth.service';
import { TokenService } from './token.service';

const SECRET = 'x'.repeat(40);
const config = new ConfigService({ JWT_ACCESS_SECRET: SECRET });
const mail = { sendPasswordReset: jest.fn() };
const user = {
  id: 'u',
  email: 'a@b.c',
  role: 'CUSTOMER',
  isActive: true,
  authVersion: 0,
};

function build(prisma: any) {
  const tokens = new TokenService(config);
  return {
    tokens,
    service: new AuthService(prisma, tokens, mail as any, config),
  };
}

describe('TokenService', () => {
  it('từ chối khi thiếu JWT_ACCESS_SECRET', () => {
    expect(() => new TokenService(new ConfigService({}))).toThrow();
  });
  it('ký và kiểm tra access token, chữ ký sai là 401', () => {
    const { tokens } = build({});
    const jwt = tokens.signAccess({
      sub: 'u',
      sid: 's',
      authVersion: 1,
      role: 'ADMIN',
    });
    expect(tokens.verifyAccess(jwt)).toMatchObject({
      sub: 'u',
      sid: 's',
      authVersion: 1,
    });
    expect(() => tokens.verifyAccess(jwt + 'x')).toThrow(UnauthorizedException);
  });
});

describe('AuthService đăng ký', () => {
  it('đổi lỗi unique đồng thời thành 409', async () => {
    const prisma = {
      user: { findUnique: jest.fn().mockResolvedValue(null) },
      $transaction: jest.fn().mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('chi tiết nội bộ', {
          code: 'P2002',
          clientVersion: '5.22.0',
        }),
      ),
    };
    await expect(
      build(prisma).service.register({
        name: 'T U',
        email: 'a@b.c',
        password: 'secret123',
      }),
    ).rejects.toEqual(new ConflictException('Email already exists'));
  });
  it('tạo user, phiên và refresh token cùng transaction, chỉ lưu hash', async () => {
    const tx = {
      user: { create: jest.fn().mockResolvedValue(user) },
      authSession: { create: jest.fn().mockResolvedValue({ id: 's' }) },
      refreshToken: { create: jest.fn().mockResolvedValue({}) },
    };
    const prisma = {
      user: { findUnique: jest.fn().mockResolvedValue(null) },
      $transaction: jest.fn(async (cb) => cb(tx)),
    };
    const result = await build(prisma).service.register({
      name: 'T U',
      email: 'a@b.c',
      password: 'secret123',
    });
    const stored = tx.refreshToken.create.mock.calls[0][0].data;
    expect(stored.tokenHash).not.toBe(result.refreshToken);
    expect(stored.sessionId).toBe('s');
  });
});

describe('AuthService refresh xoay vòng', () => {
  function refreshPrisma(over: { consumedAt: Date | null }) {
    const tx = {
      $queryRaw: jest.fn(),
      refreshToken: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'r',
          sessionId: 's',
          expiresAt: new Date(Date.now() + 1e6),
          consumedAt: over.consumedAt,
        }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        create: jest.fn().mockResolvedValue({}),
      },
      authSession: {
        findUnique: jest.fn().mockResolvedValue({
          id: 's',
          revokedAt: null,
          expiresAt: new Date(Date.now() + 1e6),
          user,
        }),
      },
    };
    const prisma = {
      $transaction: jest.fn(async (cb) => cb(tx)),
      authSession: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
    };
    return { prisma, tx };
  }

  it('tiêu token cũ và cấp cặp token mới kế thừa hạn family', async () => {
    const { prisma, tx } = refreshPrisma({ consumedAt: null });
    const out = await build(prisma).service.refresh('raw');
    expect(out.accessToken).toBeTruthy();
    expect(out.refreshToken).not.toBe('raw');
    expect(tx.refreshToken.updateMany).toHaveBeenCalled();
    expect(prisma.authSession.updateMany).not.toHaveBeenCalled();
  });
  it('dùng lại token đã tiêu thì thu hồi cả family và trả 401', async () => {
    const { prisma } = refreshPrisma({ consumedAt: new Date() });
    await expect(build(prisma).service.refresh('raw')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(prisma.authSession.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 's', revokedAt: null } }),
    );
  });
});

describe('AuthService authenticate', () => {
  it('từ chối khi authVersion của access token đã lỗi thời', async () => {
    const prisma = {
      authSession: {
        findUnique: jest.fn().mockResolvedValue({
          id: 's',
          userId: 'u',
          revokedAt: null,
          expiresAt: new Date(Date.now() + 1e6),
          lastUsedAt: new Date(),
          user: { ...user, authVersion: 2 },
        }),
      },
    };
    const { service, tokens } = build(prisma);
    const jwt = tokens.signAccess({
      sub: 'u',
      sid: 's',
      authVersion: 1,
      role: 'CUSTOMER',
    });
    await expect(service.authenticate(jwt)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
