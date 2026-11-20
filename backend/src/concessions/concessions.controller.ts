/**
 * Mục đích: Tiếp nhận yêu cầu HTTP cho miền combo bắp nước và chuyển xử lý sang service.
 */
import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ConcessionsService } from './concessions.service';

@ApiTags('concession-combos')
@ApiBearerAuth()
@Controller('concession-combos')
// Lớp ConcessionsController nhận thao tác từ HTTP hoặc giao diện và chuyển chúng tới lớp nghiệp vụ phù hợp.
export class ConcessionsController {
  constructor(private readonly concessionsService: ConcessionsService) {}

  @Get()
  // Kiểm tra điều kiện nghiệp vụ trong khối listActiveCombos trước khi tiếp tục.
  listActiveCombos() {
    return this.concessionsService.listActiveCombos();
  }
}
