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

export class CreateGenreDto {
  @ApiProperty()
  @IsString()
  name: string;
}

export class UpdateGenreDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;
}

export class CreateCinemaChainDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional({ default: 'Đà Nẵng' })
  @IsOptional()
  @IsString()
  city?: string;
}

export class UpdateCinemaChainDto extends CreateCinemaChainDto {}

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

export class UpdateMovieDto extends CreateMovieDto {}

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

export class RoomAvailableSlotsQueryDto {
  @ApiProperty()
  @IsString()
  movieId: string;

  @ApiProperty({ example: '2026-07-13' })
  @IsDateString()
  date: string;
}

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

export class UpdateCinemaDto extends CreateCinemaDto {}

export class UpsertCinemaTicketPriceDto {
  @ApiProperty({ enum: ['STANDARD', 'VIP', 'COUPLE'] })
  @IsEnum(['STANDARD', 'VIP', 'COUPLE'])
  seatType: 'STANDARD' | 'VIP' | 'COUPLE';

  @ApiProperty()
  @IsNumber()
  @Min(0)
  price: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

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

export class UpdateConcessionComboDto extends CreateConcessionComboDto {}

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

  @ApiPropertyOptional({ enum: ['STANDARD', 'VIP', 'COUPLE'] })
  @IsOptional()
  @IsEnum(['STANDARD', 'VIP', 'COUPLE'])
  type?: 'STANDARD' | 'VIP' | 'COUPLE';
}

export class UpdateSeatDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  position?: number;

  @ApiPropertyOptional({ enum: ['STANDARD', 'VIP', 'COUPLE'] })
  @IsOptional()
  @IsEnum(['STANDARD', 'VIP', 'COUPLE'])
  type?: 'STANDARD' | 'VIP' | 'COUPLE';
}

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

export class UpdateShowtimeDto extends CreateShowtimeDto {}
