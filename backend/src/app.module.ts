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
    BookingsModule,
    ConcessionsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
