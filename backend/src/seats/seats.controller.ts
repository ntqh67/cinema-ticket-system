/**
 * Mục đích: Tiếp nhận yêu cầu HTTP cho miền sơ đồ và trạng thái ghế và chuyển xử lý sang service.
 */
import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { OptionalAuthGuard } from '../auth/guards/optional-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { GuestSessionDto } from '../seat-holds/dto/guest-session.dto';
import { resolveHoldActor } from '../seat-holds/hold-actor';
import { SeatsService } from './seats.service';

@ApiTags('showtimes')
@ApiBearerAuth()
@Controller('showtimes')
@UseGuards(OptionalAuthGuard)
// Lớp SeatsController nhận thao tác từ HTTP hoặc giao diện và chuyển chúng tới lớp nghiệp vụ phù hợp.
export class SeatsController {
  constructor(private readonly seatsService: SeatsService) {}

  @Get(':showtimeId/seats')
  // Seat map công khai, nhưng heldByMe chỉ dựa trên actor đã xác định hợp lệ.
  findByShowtime(
    @Param('showtimeId') showtimeId: string,
    @Query() query: GuestSessionDto,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.seatsService.findByShowtime(
      showtimeId,
      resolveHoldActor(user, query.guestSessionId),
    );
  }
}
