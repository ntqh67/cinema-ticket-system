import { AuthGuard } from '../auth/guards/auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { Body, Controller, Patch, UseGuards } from '@nestjs/common';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UsersService } from './users.service';

@UseGuards(AuthGuard)
@Controller('users')
// Điều phối HTTP và chuyển danh tính phiên sang nghiệp vụ đúng miền.
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Patch('me')
  // Chỉ cập nhật hồ sơ tài khoản đã được xác thực.
  updateProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(user.id, updateProfileDto);
  }
}
