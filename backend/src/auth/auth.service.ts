/**
 * Mục đích: Nghiệp vụ xác thực: đăng ký, đăng nhập, access token JWT ngắn hạn,
 * refresh token xoay vòng theo family, đổi/đặt lại mật khẩu. Dữ liệu bền vững qua Prisma.
 */
import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, Role, type User } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { splitName, toPublicUser } from '../common/public-user';
import { PrismaService } from '../prisma/prisma.service';
import {
  PASSWORD_RESET_TTL_MINUTES_DEFAULT,
  SESSION_TOUCH_INTERVAL_MS,
} from './auth.constants';
import {
  ChangePasswordDto,
  ForgotPasswordDto,
  ResetPasswordDto,
} from './dto/password-flow.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { MailService } from './mail.service';
import { TokenService } from './token.service';

const BCRYPT_COST = 10;
// Hash giả để login email không tồn tại tốn thời gian tương đương, tránh dò tài khoản.
const DUMMY_HASH = bcrypt.hashSync('khong-ton-tai', BCRYPT_COST);
// Không gửi lại email đặt lại mật khẩu trong khoảng này cho cùng một tài khoản.
const RESET_COOLDOWN_MS = 60 * 1000;

type Db = Prisma.TransactionClient;

@Injectable()
// Lớp AuthService tập trung quy tắc xác thực; mọi thay đổi nhiều bảng nằm trong transaction.
export class AuthService {
  private readonly resetTtlMs: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokenService,
    private readonly mail: MailService,
    config: ConfigService,
  ) {
    this.resetTtlMs =
      Number(
        config.get('PASSWORD_RESET_TTL_MINUTES') ??
          PASSWORD_RESET_TTL_MINUTES_DEFAULT,
      ) *
      60 *
      1000;
  }

  // Đăng ký customer; user và phiên đầu tiên cùng transaction, race unique trả 409.
  async register(registerDto: RegisterDto) {
    const email = registerDto.email.trim().toLowerCase();
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });
    if (existingUser) throw new ConflictException('Email already exists');

    const { firstName, lastName } = splitName(registerDto.name);
    const passwordHash = await bcrypt.hash(registerDto.password, BCRYPT_COST);
    try {
      return await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
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
          user: toPublicUser(user),
          ...(await this.openSession(user, tx)),
        };
      });
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Email already exists');
      }
      throw error;
    }
  }

  // Đăng nhập bằng email/username; mọi lỗi trả cùng một thông báo.
  async login(loginDto: LoginDto) {
    const identifier = loginDto.identifier.trim().toLowerCase();
    const user = await this.prisma.user.findFirst({
      where: { OR: [{ username: identifier }, { email: identifier }] },
    });
    const validPassword = await bcrypt.compare(
      loginDto.password,
      user?.passwordHash ?? DUMMY_HASH,
    );
    if (!user || !user.isActive || !validPassword) {
      throw new UnauthorizedException('Invalid username/email or password');
    }
    return {
      user: toPublicUser(user),
      ...(await this.openSession(user, this.prisma)),
    };
  }

  // Tạo family mới (hạn tuyệt đối theo REFRESH_TTL_DAYS) cùng refresh token đầu tiên.
  private async openSession(user: User, db: Db) {
    const expiresAt = new Date(Date.now() + this.tokens.refreshTtlMs);
    const session = await db.authSession.create({
      data: { userId: user.id, expiresAt },
    });
    const refreshToken = await this.issueRefreshToken(
      session.id,
      expiresAt,
      db,
    );
    return { accessToken: this.signAccess(user, session.id), refreshToken };
  }

  private signAccess(user: User, sessionId: string) {
    return this.tokens.signAccess({
      sub: user.id,
      sid: sessionId,
      authVersion: user.authVersion,
      role: user.role,
    });
  }

  // Refresh token mới kế thừa hạn của family nên xoay vòng không kéo dài phiên.
  private async issueRefreshToken(sessionId: string, expiresAt: Date, db: Db) {
    const raw = this.tokens.newOpaqueToken();
    await db.refreshToken.create({
      data: { sessionId, tokenHash: this.tokens.hash(raw), expiresAt },
    });
    return raw;
  }

  // Xoay vòng refresh token; dùng lại token đã tiêu thì thu hồi cả family.
  async refresh(rawToken: string) {
    const tokenHash = this.tokens.hash(rawToken);
    const outcome = await this.prisma.$transaction(async (tx) => {
      const found = await tx.refreshToken.findUnique({ where: { tokenHash } });
      if (!found) return { kind: 'invalid' as const };
      // Khóa dòng family để hai request refresh đồng thời được tuần tự hóa.
      await tx.$queryRaw`SELECT id FROM auth_sessions WHERE id = ${found.sessionId} FOR UPDATE`;
      const session = await tx.authSession.findUnique({
        where: { id: found.sessionId },
        include: { user: true },
      });
      const current = await tx.refreshToken.findUnique({
        where: { id: found.id },
      });
      if (!session || !current) return { kind: 'invalid' as const };
      if (current.consumedAt) {
        return { kind: 'reuse' as const, sessionId: session.id };
      }
      const now = new Date();
      if (
        session.revokedAt ||
        session.expiresAt <= now ||
        current.expiresAt <= now ||
        !session.user.isActive
      ) {
        return { kind: 'invalid' as const };
      }
      const consumed = await tx.refreshToken.updateMany({
        where: { id: current.id, consumedAt: null },
        data: { consumedAt: now },
      });
      if (consumed.count !== 1) {
        return { kind: 'reuse' as const, sessionId: session.id };
      }
      const refreshToken = await this.issueRefreshToken(
        session.id,
        session.expiresAt,
        tx,
      );
      return {
        kind: 'ok' as const,
        accessToken: this.signAccess(session.user, session.id),
        refreshToken,
      };
    });

    if (outcome.kind === 'reuse') {
      // Thu hồi chạy ngoài transaction đã trả về để không bị rollback cùng lỗi 401.
      await this.revokeSession(outcome.sessionId);
    }
    if (outcome.kind !== 'ok') {
      throw new UnauthorizedException('Phiên đăng nhập không hợp lệ');
    }
    return {
      accessToken: outcome.accessToken,
      refreshToken: outcome.refreshToken,
    };
  }

  // Xác thực access token và đối chiếu DB để logout/đổi mật khẩu có hiệu lực ngay.
  async authenticate(accessToken: string) {
    const claims = this.tokens.verifyAccess(accessToken);
    const now = new Date();
    const session = await this.prisma.authSession.findUnique({
      where: { id: claims.sid },
      include: { user: true },
    });
    if (
      !session ||
      session.userId !== claims.sub ||
      session.revokedAt ||
      session.expiresAt <= now ||
      !session.user.isActive ||
      session.user.authVersion !== claims.authVersion
    ) {
      throw new UnauthorizedException('Phiên đăng nhập không hợp lệ');
    }
    // Giới hạn ghi lastUsedAt tối đa một lần mỗi 5 phút cho mỗi phiên.
    const cutoff = new Date(now.getTime() - SESSION_TOUCH_INTERVAL_MS);
    if (!session.lastUsedAt || session.lastUsedAt <= cutoff) {
      await this.prisma.authSession.updateMany({
        where: {
          id: session.id,
          revokedAt: null,
          OR: [{ lastUsedAt: null }, { lastUsedAt: { lte: cutoff } }],
        },
        data: { lastUsedAt: now },
      });
    }
    const { passwordHash: _hash, updatedAt: _updated, ...user } = session.user;
    return { sessionId: session.id, user };
  }

  // Logout thu hồi cả family từ access token hiện tại.
  async logout(sessionId: string) {
    await this.revokeSession(sessionId);
    return { success: true };
  }

  // Logout bằng refresh token: luôn thành công kể cả token lạ hoặc đã thu hồi.
  async logoutWithRefreshToken(rawToken: string) {
    const found = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: this.tokens.hash(rawToken) },
    });
    if (found) await this.revokeSession(found.sessionId);
    return { success: true };
  }

  private async revokeSession(sessionId: string) {
    await this.prisma.authSession.updateMany({
      where: { id: sessionId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  // Đổi mật khẩu: tăng authVersion và thu hồi mọi phiên trong một transaction.
  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (
      !user ||
      !(await bcrypt.compare(dto.currentPassword, user.passwordHash))
    ) {
      throw new BadRequestException('Mật khẩu hiện tại không đúng');
    }
    await this.replacePassword(userId, dto.newPassword);
    return { success: true };
  }

  // Quên mật khẩu: luôn trả thành công để không lộ email có tồn tại hay không.
  async forgotPassword(dto: ForgotPasswordDto) {
    const email = dto.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive) return { success: true };

    const latest = await this.prisma.passwordResetToken.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });
    if (latest && Date.now() - latest.createdAt.getTime() < RESET_COOLDOWN_MS) {
      return { success: true };
    }
    const raw = this.tokens.newOpaqueToken();
    // Token cũ chưa dùng bị thay thế để mỗi tài khoản chỉ có một liên kết hợp lệ.
    await this.prisma.$transaction([
      this.prisma.passwordResetToken.deleteMany({
        where: { userId: user.id, consumedAt: null },
      }),
      this.prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash: this.tokens.hash(raw),
          expiresAt: new Date(Date.now() + this.resetTtlMs),
        },
      }),
    ]);
    await this.mail.sendPasswordReset(user.email, raw);
    return { success: true };
  }

  // Đặt lại mật khẩu bằng token một lần; thành công thu hồi mọi phiên.
  async resetPassword(dto: ResetPasswordDto) {
    const tokenHash = this.tokens.hash(dto.token);
    const passwordHash = await bcrypt.hash(dto.newPassword, BCRYPT_COST);
    await this.prisma.$transaction(async (tx) => {
      const now = new Date();
      const consumed = await tx.passwordResetToken.updateMany({
        where: { tokenHash, consumedAt: null, expiresAt: { gt: now } },
        data: { consumedAt: now },
      });
      if (consumed.count !== 1) {
        throw new BadRequestException('Token không hợp lệ hoặc đã hết hạn');
      }
      const token = await tx.passwordResetToken.findUniqueOrThrow({
        where: { tokenHash },
      });
      await this.applyPassword(tx, token.userId, passwordHash);
    });
    return { success: true };
  }

  private async replacePassword(userId: string, newPassword: string) {
    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_COST);
    await this.prisma.$transaction((tx) =>
      this.applyPassword(tx, userId, passwordHash),
    );
  }

  // Ghi mật khẩu mới, tăng authVersion và thu hồi mọi family của user.
  private async applyPassword(tx: Db, userId: string, passwordHash: string) {
    await tx.user.update({
      where: { id: userId },
      data: { passwordHash, authVersion: { increment: 1 } },
    });
    await tx.authSession.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
