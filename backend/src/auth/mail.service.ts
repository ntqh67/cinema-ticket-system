/**
 * Mục đích: Gửi email đặt lại mật khẩu qua SMTP (Gmail App password).
 * Không ghi log token, mật khẩu hay nội dung thư.
 */
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, type Transporter } from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: Transporter | null;
  private readonly from: string;
  private readonly frontendUrl: string;

  constructor(config: ConfigService) {
    const user = config.get<string>('MAIL_USER');
    const pass = config.get<string>('MAIL_PASSWORD');
    this.from = config.get<string>('MAIL_FROM') || user || '';
    this.frontendUrl = config.get<string>('FRONTEND_URL') || '';
    // Chưa cấu hình SMTP thì chỉ cảnh báo; luồng quên mật khẩu vẫn trả 202.
    this.transporter =
      user && pass
        ? createTransport({
            host: config.get<string>('MAIL_HOST') || 'smtp.gmail.com',
            port: Number(config.get('MAIL_PORT') ?? 465),
            secure: Number(config.get('MAIL_PORT') ?? 465) === 465,
            auth: { user, pass },
          })
        : null;
  }

  // Gửi liên kết đặt lại; lỗi SMTP không được làm lộ việc email có tồn tại.
  async sendPasswordReset(to: string, token: string): Promise<void> {
    if (!this.transporter) {
      this.logger.warn('Chưa cấu hình SMTP, bỏ qua gửi email đặt lại mật khẩu');
      return;
    }
    const link = `${this.frontendUrl}/#/reset-password?token=${encodeURIComponent(token)}`;
    try {
      await this.transporter.sendMail({
        from: this.from,
        to,
        subject: 'Đặt lại mật khẩu CineTicket',
        text: `Bạn vừa yêu cầu đặt lại mật khẩu. Mở liên kết sau (hết hạn sau ít phút, dùng một lần):\n${link}\nNếu không phải bạn, hãy bỏ qua email này.`,
      });
    } catch {
      this.logger.error('Gửi email đặt lại mật khẩu thất bại');
    }
  }
}
