/**
 * Mục đích: Khai báo module NestJS và liên kết các thành phần của miền phim và đánh giá phim.
 */
import { Module } from '@nestjs/common';
import { MoviesController } from './movies.controller';
import { MoviesService } from './movies.service';

@Module({
  controllers: [MoviesController],
  providers: [MoviesService],
})
// Lớp MoviesModule đăng ký controller, service và các module phụ thuộc với NestJS.
export class MoviesModule {}
