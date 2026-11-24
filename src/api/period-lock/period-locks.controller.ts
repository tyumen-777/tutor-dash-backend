import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
} from '@nestjs/swagger';
import {
  OrgRoles,
  RequireActiveOrg,
  Session,
  type UserSession,
} from '@thallesp/nestjs-better-auth';

import {
  closePeriodSchema,
  type ClosePeriodDto,
  periodLockListResponseSchema,
  type PeriodLockListResponseDto,
  periodLockResponseSchema,
  type PeriodLockResponseDto,
  periodMonthSchema,
} from './dto/period-lock.dto.js';
import { PeriodLocksService } from './period-locks.service.js';

@Controller('period-locks')
export class PeriodLocksController {
  constructor(private readonly periodLocksService: PeriodLocksService) {}

  @RequireActiveOrg()
  @OrgRoles(['owner', 'admin', 'manager', 'accountant'])
  @Get()
  @ApiOperation({
    summary: 'Закрытые месяцы',
    description:
      'Возвращает закрытые месяцы школы (от новых к старым) и текущий месяц по календарю школы. Оплаты, занятия и расходы закрытого месяца нельзя вносить, менять и отменять.',
  })
  @ApiOkResponse({
    description: 'Закрытые месяцы.',
    standardSchema: periodLockListResponseSchema,
  })
  listPeriodLocks(
    @Session() session: UserSession,
  ): Promise<PeriodLockListResponseDto> {
    return this.periodLocksService.listLocks(session);
  }

  @RequireActiveOrg()
  @OrgRoles(['owner', 'admin'])
  @Post()
  @ApiOperation({
    summary: 'Закрытие месяца',
    description:
      'Закрывает завершившийся месяц: его оплаты, занятия и расходы больше нельзя вносить, менять и отменять (кроме комментариев, темы и домашнего задания). Операция попадает в историю.',
  })
  @ApiCreatedResponse({
    description: 'Месяц закрыт.',
    standardSchema: periodLockResponseSchema,
  })
  @ApiBadRequestResponse({
    description: 'Месяц ещё не закончился.',
  })
  @ApiConflictResponse({ description: 'Месяц уже закрыт.' })
  closePeriod(
    @Session() session: UserSession,
    @Body({ schema: closePeriodSchema }) body: ClosePeriodDto,
  ): Promise<PeriodLockResponseDto> {
    return this.periodLocksService.closePeriod(session, body.month);
  }

  @RequireActiveOrg()
  @OrgRoles(['owner'])
  @Delete(':month')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Открытие месяца',
    description:
      'Снова открывает закрытый месяц для изменений. Доступно только владельцу, операция попадает в историю.',
  })
  @ApiNoContentResponse({ description: 'Месяц открыт.' })
  @ApiNotFoundResponse({ description: 'Месяц не закрыт.' })
  reopenPeriod(
    @Session() session: UserSession,
    @Param('month', { schema: periodMonthSchema }) month: string,
  ): Promise<void> {
    return this.periodLocksService.reopenPeriod(session, month);
  }
}
