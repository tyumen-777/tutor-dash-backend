import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
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
import { z } from 'zod';

import {
  createExpenseSchema,
  type CreateExpenseDto,
} from './dto/create-expense.dto.js';
import {
  expenseListResponseSchema,
  type ExpenseListResponseDto,
  expenseResponseSchema,
  type ExpenseResponseDto,
} from './dto/expense-response.dto.js';
import {
  listExpensesQuerySchema,
  type ListExpensesQueryDto,
} from './dto/list-expenses-query.dto.js';
import {
  updateExpenseSchema,
  type UpdateExpenseDto,
} from './dto/update-expense.dto.js';
import { ExpensesService } from './expenses.service.js';

@Controller('expenses')
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @RequireActiveOrg()
  @OrgRoles(['owner', 'admin', 'accountant'])
  @Get()
  @ApiOperation({
    summary: 'Список расходов',
    description:
      'Возвращает расходы активной организации с фильтрами по периоду, категориям, статусу и преподавателю, пагинацией и итогами без учёта отменённых расходов. Сортировка от новых к старым.',
  })
  @ApiOkResponse({
    description: 'Страница расходов с итогами.',
    standardSchema: expenseListResponseSchema,
  })
  listExpenses(
    @Session() session: UserSession,
    @Query({ schema: listExpensesQuerySchema }) query: ListExpensesQueryDto,
  ): Promise<ExpenseListResponseDto> {
    return this.expensesService.listExpenses(session, query);
  }

  @RequireActiveOrg()
  @OrgRoles(['owner', 'admin', 'accountant'])
  @Get(':id')
  @ApiOperation({
    summary: 'Получение расхода',
    description: 'Возвращает расход активной организации по идентификатору.',
  })
  @ApiOkResponse({
    description: 'Данные расхода.',
    standardSchema: expenseResponseSchema,
  })
  @ApiNotFoundResponse({ description: 'Расход не найден.' })
  getExpense(
    @Session() session: UserSession,
    @Param('id', { schema: z.uuid() }) id: string,
  ): Promise<ExpenseResponseDto> {
    return this.expensesService.getExpense(session, id);
  }

  @RequireActiveOrg()
  @OrgRoles(['owner', 'admin', 'accountant'])
  @Post()
  @ApiOperation({
    summary: 'Внесение расхода',
    description:
      'Регистрирует расход школы. Для зарплаты можно указать преподавателя, получившего выплату.',
  })
  @ApiCreatedResponse({
    description: 'Расход внесён.',
    standardSchema: expenseResponseSchema,
  })
  @ApiBadRequestResponse({
    description: 'Преподаватель не найден или дата расхода в будущем.',
  })
  createExpense(
    @Session() session: UserSession,
    @Body({ schema: createExpenseSchema }) body: CreateExpenseDto,
  ): Promise<ExpenseResponseDto> {
    return this.expensesService.createExpense(session, body);
  }

  @RequireActiveOrg()
  @OrgRoles(['owner', 'admin', 'accountant'])
  @Patch(':id')
  @ApiOperation({
    summary: 'Изменение расхода',
    description:
      'Меняет поля расхода. При смене категории с «Зарплата» на другую преподаватель отвязывается.',
  })
  @ApiOkResponse({
    description: 'Расход изменён.',
    standardSchema: expenseResponseSchema,
  })
  @ApiBadRequestResponse({
    description: 'Преподаватель не найден или дата расхода в будущем.',
  })
  @ApiNotFoundResponse({ description: 'Расход не найден.' })
  @ApiConflictResponse({ description: 'Расход отменён.' })
  updateExpense(
    @Session() session: UserSession,
    @Param('id', { schema: z.uuid() }) id: string,
    @Body({ schema: updateExpenseSchema }) body: UpdateExpenseDto,
  ): Promise<ExpenseResponseDto> {
    return this.expensesService.updateExpense(session, id, body);
  }

  @RequireActiveOrg()
  @OrgRoles(['owner', 'admin', 'accountant'])
  @Post(':id/cancel')
  @ApiOperation({
    summary: 'Отмена расхода',
    description:
      'Переводит расход в статус «Отменён». Расход остаётся в истории, но не входит в итоги.',
  })
  @ApiOkResponse({
    description: 'Расход отменён.',
    standardSchema: expenseResponseSchema,
  })
  @ApiNotFoundResponse({ description: 'Расход не найден.' })
  @ApiConflictResponse({ description: 'Расход уже отменён.' })
  cancelExpense(
    @Session() session: UserSession,
    @Param('id', { schema: z.uuid() }) id: string,
  ): Promise<ExpenseResponseDto> {
    return this.expensesService.cancelExpense(session, id);
  }
}
