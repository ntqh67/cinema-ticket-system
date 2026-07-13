import { IsIn, IsString } from 'class-validator';

export const ONLINE_DEMO_PAYMENT_PROVIDERS = [
  'vnpay',
  'card',
  'momo',
  'zalopay',
] as const;

export type OnlineDemoPaymentProvider =
  (typeof ONLINE_DEMO_PAYMENT_PROVIDERS)[number];

export class OnlineDemoPaymentDto {
  @IsString()
  @IsIn(ONLINE_DEMO_PAYMENT_PROVIDERS)
  provider: OnlineDemoPaymentProvider;
}
