/**
 * Mục đích: Khai báo module NestJS và liên kết các thành phần của miền kết nối Redis.
 */
import { Global, Module } from '@nestjs/common';
import { RedisService } from './redis.service';

@Global()
@Module({
  providers: [RedisService],
  exports: [RedisService],
})
// Lớp RedisModule đăng ký controller, service và các module phụ thuộc với NestJS.
export class RedisModule {}
