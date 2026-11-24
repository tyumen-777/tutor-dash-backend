import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import {
  OrgRoles,
  RequireActiveOrg,
  Session,
  type UserSession,
} from '@thallesp/nestjs-better-auth';

import {
  financeLogListResponseSchema,
  type FinanceLogListResponseDto,
} from './dto/finance-log-response.dto.js';
import {
  listFinanceLogsQuerySchema,
  type ListFinanceLogsQueryDto,
} from './dto/list-finance-logs-query.dto.js';
import { FinanceLogsService } from './finance-logs.service.js';

@Controller('finance-logs')
export class FinanceLogsController {
  constructor(private readonly financeLogsService: FinanceLogsService) {}

  @RequireActiveOrg()
  @OrgRoles(['owner', 'admin', 'manager', 'accountant'])
  @Get()
  @ApiOperation({
    summary: 'История финансовых операций',
    description:
      'Кто и когда внёс, изменил или отменил оплату. Записи только добавляются и не редактируются. Сортировка от новых к старым.',
  })
  @ApiOkResponse({
    description: 'Страница истории операций.',
    standardSchema: financeLogListResponseSchema,
  })
  listLogs(
    @Session() session: UserSession,
    @Query({ schema: listFinanceLogsQuerySchema })
    query: ListFinanceLogsQueryDto,
  ): Promise<FinanceLogListResponseDto> {
    return this.financeLogsService.listLogs(session, query);
  }
}
