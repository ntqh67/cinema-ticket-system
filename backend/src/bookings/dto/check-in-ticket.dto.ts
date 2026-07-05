import { IsOptional, IsString } from 'class-validator';

export class CheckInTicketDto {
  @IsOptional()
  @IsString()
  checkedInBy?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
