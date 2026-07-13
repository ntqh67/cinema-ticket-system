/**
 * Mục đích: Định nghĩa dữ liệu đầu vào và các quy tắc kiểm tra cho miền đặt vé, thanh toán và vé điện tử.
 */
import { IsIn, IsString } from 'class-validator';

export const ONLINE_DEMO_PAYMENT_PROVIDERS = [
  'vnpay',
  'card',
  'momo',
  'zalopay',
] as const;

export type OnlineDemoPaymentProvider =
  (typeof ONLINE_DEMO_PAYMENT_PROVIDERS)[number];

// Lớp OnlineDemoPaymentDto mô tả cấu trúc dữ liệu đầu vào và kích hoạt validation.
export class OnlineDemoPaymentDto {
  @IsString()
  @IsIn(ONLINE_DEMO_PAYMENT_PROVIDERS)
  provider: OnlineDemoPaymentProvider;
}
