import { Body, Controller, Delete, Param, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CreateSeatHoldDto } from './dto/create-seat-hold.dto';
import { SeatHoldsService } from './seat-holds.service';

@ApiTags('seat-holds')
@Controller('seat-holds')
export class SeatHoldsController {
  constructor(private readonly seatHoldsService: SeatHoldsService) {}

  @Post()
  hold(@Body() dto: CreateSeatHoldDto) {
    return this.seatHoldsService.hold(dto);
  }

  @Delete(':showtimeSeatId')
  release(
    @Param('showtimeSeatId') showtimeSeatId: string,
    @Query('sessionId') sessionId: string,
    @Query('userId') userId?: string,
  ) {
    return this.seatHoldsService.release({ showtimeSeatId, sessionId, userId });
  }
}
