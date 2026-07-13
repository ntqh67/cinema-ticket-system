import { ArrayNotEmpty, IsArray, IsString } from 'class-validator';

export class CreateBookingDto {
  @IsString()
  userId: string;

  @IsString()
  showtimeId: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  showtimeSeatIds: string[];

  @IsString()
  sessionId: string;
}
