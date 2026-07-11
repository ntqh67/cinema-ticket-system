import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsInt, IsString, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class BookingComboSelectionDto {
  @ApiProperty()
  @IsString()
  comboId: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  quantity: number;
}

export class UpdateBookingCombosDto {
  @ApiProperty({ type: [BookingComboSelectionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BookingComboSelectionDto)
  items: BookingComboSelectionDto[];
}
