import { IsOptional, IsString } from 'class-validator';

export class CreateSeatHoldDto {
  @IsString()
  showtimeId: string;

  @IsString()
  showtimeSeatId: string;

  @IsString()
  sessionId: string;

  @IsOptional()
  @IsString()
  userId?: string;
}
