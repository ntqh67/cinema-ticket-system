/**
 * Mục đích: Tiếp nhận yêu cầu HTTP cho miền giữ ghế tạm thời và chuyển xử lý sang service.
 */
import {
  Body,
  Controller,
  Delete,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { OptionalAuthGuard } from '../auth/guards/optional-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { GuestSessionDto } from './dto/guest-session.dto';
import { resolveHoldActor } from './hold-actor';
import { CreateSeatHoldDto } from './dto/create-seat-hold.dto';
import { SeatHoldsService } from './seat-holds.service';

@ApiTags('seat-holds')
@ApiBearerAuth()
@UseGuards(OptionalAuthGuard)
@Controller('seat-holds')
// Lớp SeatHoldsController nhận thao tác từ HTTP hoặc giao diện và chuyển chúng tới lớp nghiệp vụ phù hợp.
export class SeatHoldsController {
  constructor(private readonly seatHoldsService: SeatHoldsService) {}

  @Post()
  // User đến từ AuthSession; DTO chỉ cung cấp ghế và bằng chứng guest.
  hold(
    @Body() dto: CreateSeatHoldDto,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.seatHoldsService.hold(
      dto,
      resolveHoldActor(user, dto.guestSessionId),
    );
  }

  @Delete(':showtimeSeatId')
  // Nhả ghế bằng owner hiện tại, không lấy userId từ query.
  release(
    @Param('showtimeSeatId') showtimeSeatId: string,
    @Query() query: GuestSessionDto,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.seatHoldsService.release(
      showtimeSeatId,
      resolveHoldActor(user, query.guestSessionId),
    );
  }
}
