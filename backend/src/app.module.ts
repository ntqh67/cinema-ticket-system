/**
 * Mục đích: Khai báo module NestJS và liên kết các thành phần của miền khởi tạo và tiện ích dùng chung.
 */
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AdminModule } from './admin/admin.module';
import { AuthModule } from './auth/auth.module';
import { BookingsModule } from './bookings/bookings.module';
import { ConcessionsModule } from './concessions/concessions.module';
import { HealthModule } from './health/health.module';
import { MoviesModule } from './movies/movies.module';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { SeatHoldsModule } from './seat-holds/seat-holds.module';
import { SeatsModule } from './seats/seats.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '../.env',
    }),
    PrismaModule,
    RedisModule,
    HealthModule,
    AuthModule,
    AdminModule,
    MoviesModule,
    SeatHoldsModule,
    SeatsModule,
    UsersModule,
    BookingsModule,
    ConcessionsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
// Lớp AppModule đăng ký controller, service và các module phụ thuộc với NestJS.
export class AppModule {}
