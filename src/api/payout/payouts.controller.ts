import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
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
  expenseResponseSchema,
  type ExpenseResponseDto,
} from '../expense/dto/expense-response.dto.js';
import {
  createPayoutSchema,
  type CreatePayoutDto,
} from './dto/create-payout.dto.js';
import {
  payoutReportQuerySchema,
  type PayoutReportQueryDto,
} from './dto/payout-report-query.dto.js';
import {
  payoutReportResponseSchema,
  type PayoutReportResponseDto,
} from './dto/payout-report-response.dto.js';
import { PayoutsService } from './payouts.service.js';

@Controller('payouts')
export class PayoutsController {
  constructor(private readonly payoutsService: PayoutsService) {}

  // Доступ как у расходов: выплата — это расход «Зарплата»
  @RequireActiveOrg()
  @OrgRoles(['owner', 'admin', 'accountant'])
  @Get('report')
  @ApiOperation({
    summary: 'Отчёт о выплатах преподавателям',
    description:
      'Возвращает по каждому преподавателю начисления за проведённые занятия периода, уже выплаченную часть, остаток к выплате и невыплаченное до начала периода. Период считается по часовому поясу школы.',
  })
  @ApiOkResponse({
    description: 'Отчёт о выплатах.',
    standardSchema: payoutReportResponseSchema,
  })
  getReport(
    @Session() session: UserSession,
    @Query({ schema: payoutReportQuerySchema }) query: PayoutReportQueryDto,
  ): Promise<PayoutReportResponseDto> {
    return this.payoutsService.getReport(session, query);
  }

  @RequireActiveOrg()
  @OrgRoles(['owner', 'admin', 'accountant'])
  @Post()
  @ApiOperation({
    summary: 'Выплата преподавателю',
    description:
      'Создаёт расход «Зарплата» на сумму начислений за все проведённые и ещё не выплаченные занятия преподавателя в периоде и отмечает эти занятия выплаченными. Отмена расхода снимает отметку.',
  })
  @ApiCreatedResponse({
    description: 'Выплата внесена.',
    standardSchema: expenseResponseSchema,
  })
  @ApiBadRequestResponse({
    description: 'Преподаватель не найден или дата выплаты в будущем.',
  })
  @ApiConflictResponse({
    description: 'В периоде нет невыплаченных занятий с начислением.',
  })
  createPayout(
    @Session() session: UserSession,
    @Body({ schema: createPayoutSchema }) body: CreatePayoutDto,
  ): Promise<ExpenseResponseDto> {
    return this.payoutsService.createPayout(session, body);
  }
}
