import { IsIn, IsString } from 'class-validator';

export class StaffCheckInDto {
  @IsString()
  @IsIn(['A', 'B', 'C'])
  shiftCode: 'A' | 'B' | 'C';
}
