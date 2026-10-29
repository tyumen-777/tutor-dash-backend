import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import {
  OrgRoles,
  RequireActiveOrg,
  Session,
  type UserSession,
} from '@thallesp/nestjs-better-auth';

import { DashboardService } from './dashboard.service.js';
import {
  dashboardSummaryResponseSchema,
  type DashboardSummaryResponseDto,
} from './dto/dashboard-summary-response.dto.js';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @RequireActiveOrg()
  @OrgRoles(['owner', 'admin', 'manager', 'accountant'])
  @Get('summary')
  @ApiOperation({
    summary: 'Сводка для главной',
    description:
      'Возвращает ключевые показатели школы за текущий месяц по часовому поясу школы: поступления и сравнение с теми же днями прошлого месяца, расходы и прибыль (только для ролей с доступом к расходам), учеников, занятия сегодня, загрузку преподавателей и учеников с остатком 0–1 занятие.',
  })
  @ApiOkResponse({
    description: 'Сводка школы.',
    standardSchema: dashboardSummaryResponseSchema,
  })
  getSummary(
    @Session() session: UserSession,
  ): Promise<DashboardSummaryResponseDto> {
    return this.dashboardService.getSummary(session);
  }
}
