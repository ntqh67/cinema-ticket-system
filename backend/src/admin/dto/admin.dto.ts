/**
 * Mục đích: Định nghĩa dữ liệu đầu vào và các quy tắc kiểm tra cho miền quản trị.
 */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  IsArray,
  IsDateString,
  IsEmail,
  IsEnum,
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

// Lớp CreateGenreDto mô tả cấu trúc dữ liệu đầu vào và kích hoạt validation.
export class CreateGenreDto {
  @ApiProperty()
  @IsString()
  name: string;
}

// Lớp UpdateGenreDto mô tả cấu trúc dữ liệu đầu vào và kích hoạt validation.
export class UpdateGenreDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;
}

// Lớp CreateCinemaChainDto mô tả cấu trúc dữ liệu đầu vào và kích hoạt validation.
export class CreateCinemaChainDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional({ default: 'Đà Nẵng' })
  @IsOptional()
  @IsString()
  city?: string;
}

// Lớp UpdateCinemaChainDto mô tả cấu trúc dữ liệu đầu vào và kích hoạt validation.
export class UpdateCinemaChainDto extends CreateCinemaChainDto {}

// Lớp CreateMovieDto mô tả cấu trúc dữ liệu đầu vào và kích hoạt validation.
export class CreateMovieDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  tmdbId?: number;

  @ApiProperty()
  @IsString()
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  posterUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  trailerUrl?: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  durationMin: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  releaseDate?: string;

  @ApiPropertyOptional({
    enum: ['DRAFT', 'NOW_SHOWING', 'COMING_SOON', 'ENDED'],
  })
  @IsOptional()
  @IsEnum(['DRAFT', 'NOW_SHOWING', 'COMING_SOON', 'ENDED'])
  status?: 'DRAFT' | 'NOW_SHOWING' | 'COMING_SOON' | 'ENDED';

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  genreIds?: string[];

  @ApiPropertyOptional({ default: 'P' })
  @IsOptional()
  @IsString()
  ageRating?: string;
}

// Lớp UpdateMovieDto mô tả cấu trúc dữ liệu đầu vào và kích hoạt validation.
export class UpdateMovieDto extends CreateMovieDto {}

// Lớp CreateMovieFromTmdbDto mô tả cấu trúc dữ liệu đầu vào và kích hoạt validation.
export class CreateMovieFromTmdbDto {
  @ApiProperty()
  @IsInt()
  @Min(1)
  tmdbId: number;

  @ApiPropertyOptional({
    enum: ['DRAFT', 'NOW_SHOWING', 'COMING_SOON', 'ENDED'],
  })
  @IsOptional()
  @IsEnum(['DRAFT', 'NOW_SHOWING', 'COMING_SOON', 'ENDED'])
  status?: 'DRAFT' | 'NOW_SHOWING' | 'COMING_SOON' | 'ENDED';
}

// Lớp RoomAvailableSlotsQueryDto mô tả cấu trúc dữ liệu đầu vào và kích hoạt validation.
export class RoomAvailableSlotsQueryDto {
  @ApiProperty()
  @IsString()
  movieId: string;

  @ApiProperty({ example: '2026-07-13' })
  @IsDateString()
  date: string;
}

// Lớp ImportUpcomingMoviesFromTmdbDto mô tả cấu trúc dữ liệu đầu vào và kích hoạt validation.
export class ImportUpcomingMoviesFromTmdbDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number;
}

// Lớp CreateCinemaDto mô tả cấu trúc dữ liệu đầu vào và kích hoạt validation.
export class CreateCinemaDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  chainId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  code?: string;

  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ward?: string;

  @ApiPropertyOptional({ default: 'Đà Nẵng' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  imageUrl?: string;
}

// Lớp UpdateCinemaDto mô tả cấu trúc dữ liệu đầu vào và kích hoạt validation.
export class UpdateCinemaDto extends CreateCinemaDto {}

// Lớp UpsertCinemaTicketPriceDto mô tả cấu trúc dữ liệu đầu vào và kích hoạt validation.
export class UpsertCinemaTicketPriceDto {
  @ApiProperty({ enum: ['STANDARD', 'COUPLE'] })
  @IsEnum(['STANDARD', 'COUPLE'])
  seatType: 'STANDARD' | 'COUPLE';

  @ApiProperty()
  @IsNumber()
  @Min(0)
  price: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

// Lớp CreateConcessionComboDto mô tả cấu trúc dữ liệu đầu vào và kích hoạt validation.
export class CreateConcessionComboDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  price: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

// Lớp UpdateConcessionComboDto mô tả cấu trúc dữ liệu đầu vào và kích hoạt validation.
export class UpdateConcessionComboDto extends CreateConcessionComboDto {}

// Lớp CreateRoomDto mô tả cấu trúc dữ liệu đầu vào và kích hoạt validation.
export class CreateRoomDto {
  @ApiProperty()
  @IsString()
  cinemaId: string;

  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional({
    description:
      'Tự động tính từ số ghế; giá trị gửi lên sẽ không được sử dụng',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  capacity?: number;
}

// Lớp UpdateRoomDto mô tả cấu trúc dữ liệu đầu vào và kích hoạt validation.
export class UpdateRoomDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number;
}

// Lớp CreateSeatDto mô tả cấu trúc dữ liệu đầu vào và kích hoạt validation.
export class CreateSeatDto {
  @ApiProperty()
  @IsString()
  roomId: string;

  @ApiProperty()
  @IsString()
  row: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  number: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  position?: number;

  @ApiPropertyOptional({ enum: ['STANDARD', 'COUPLE'] })
  @IsOptional()
  @IsEnum(['STANDARD', 'COUPLE'])
  type?: 'STANDARD' | 'COUPLE';
}

// Lớp UpdateSeatDto mô tả cấu trúc dữ liệu đầu vào và kích hoạt validation.
export class UpdateSeatDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  position?: number;

  @ApiPropertyOptional({ enum: ['STANDARD', 'COUPLE'] })
  @IsOptional()
  @IsEnum(['STANDARD', 'COUPLE'])
  type?: 'STANDARD' | 'COUPLE';
}

// Lớp GenerateSeatsDto mô tả cấu trúc dữ liệu đầu vào và kích hoạt validation.
export class GenerateSeatsDto {
  @ApiProperty()
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  rows: string[];

  @ApiProperty()
  @IsInt()
  @Min(1)
  columns: number;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  coupleRows?: string[];
}

// Lớp CreateShowtimeDto mô tả cấu trúc dữ liệu đầu vào và kích hoạt validation.
export class CreateShowtimeDto {
  @ApiProperty()
  @IsString()
  movieId: string;

  @ApiProperty()
  @IsString()
  roomId: string;

  @ApiProperty()
  @IsDateString()
  startAt: string;

  @ApiProperty()
  @IsDateString()
  endAt: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  basePrice: number;
}

// Lớp UpdateShowtimeDto mô tả cấu trúc dữ liệu đầu vào và kích hoạt validation.
export class UpdateShowtimeDto extends CreateShowtimeDto {}
