import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

// Dữ liệu đầu vào cho refresh và logout.
export class RefreshDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  refreshToken!: string;
}
