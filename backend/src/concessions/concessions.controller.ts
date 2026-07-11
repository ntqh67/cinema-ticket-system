import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ConcessionsService } from './concessions.service';

@ApiTags('concession-combos')
@Controller('concession-combos')
export class ConcessionsController {
  constructor(private readonly concessionsService: ConcessionsService) {}

  @Get()
  listActiveCombos() {
    return this.concessionsService.listActiveCombos();
  }
}
