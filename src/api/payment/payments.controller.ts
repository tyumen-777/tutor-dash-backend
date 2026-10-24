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
  createPaymentSchema,
  type CreatePaymentDto,
} from './dto/create-payment.dto.js';
import {
  listPaymentsQuerySchema,
  type ListPaymentsQueryDto,
} from './dto/list-payments-query.dto.js';
import {
  paymentListResponseSchema,
  type PaymentListResponseDto,
  paymentResponseSchema,
  type PaymentResponseDto,
} from './dto/payment-response.dto.js';
import {
  updatePaymentSchema,
  type UpdatePaymentDto,
} from './dto/update-payment.dto.js';
import { PaymentsService } from './payments.service.js';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @RequireActiveOrg()
  @OrgRoles(['owner', 'admin', 'manager', 'accountant'])
  @Get()
  @ApiOperation({
    summary: 'Список поступлений',
    description:
      'Возвращает оплаты учеников активной организации с фильтрами по периоду, ученику, способу и статусу, пагинацией и итогами по проведённым оплатам. Сортировка от новых к старым.',
  })
  @ApiOkResponse({
    description: 'Страница оплат с итогами.',
    standardSchema: paymentListResponseSchema,
  })
  listPayments(
    @Session() session: UserSession,
    @Query({ schema: listPaymentsQuerySchema }) query: ListPaymentsQueryDto,
  ): Promise<PaymentListResponseDto> {
    return this.paymentsService.listPayments(session, query);
  }

  @RequireActiveOrg()
  @OrgRoles(['owner', 'admin', 'manager', 'accountant'])
  @Get(':id')
  @ApiOperation({
    summary: 'Получение оплаты',
    description: 'Возвращает оплату активной организации по идентификатору.',
  })
  @ApiOkResponse({
    description: 'Данные оплаты.',
    standardSchema: paymentResponseSchema,
  })
  @ApiNotFoundResponse({ description: 'Оплата не найдена.' })
  getPayment(
    @Session() session: UserSession,
    @Param('id', { schema: z.uuid() }) id: string,
  ): Promise<PaymentResponseDto> {
    return this.paymentsService.getPayment(session, id);
  }

  @RequireActiveOrg()
  @OrgRoles(['owner', 'admin'])
  @Post()
  @ApiOperation({
    summary: 'Внесение оплаты',
    description:
      'Регистрирует оплату ученика и начисляет ему пакет с указанным количеством занятий. Количество занятий задаётся вручную, потому что стоимость пакета у учеников может отличаться.',
  })
  @ApiCreatedResponse({
    description: 'Оплата внесена, пакет занятий начислен.',
    standardSchema: paymentResponseSchema,
  })
  @ApiBadRequestResponse({
    description: 'Ученик не найден или дата оплаты в будущем.',
  })
  createPayment(
    @Session() session: UserSession,
    @Body({ schema: createPaymentSchema }) body: CreatePaymentDto,
  ): Promise<PaymentResponseDto> {
    return this.paymentsService.createPayment(session, body);
  }

  @RequireActiveOrg()
  @OrgRoles(['owner', 'admin'])
  @Patch(':id')
  @ApiOperation({
    summary: 'Изменение оплаты',
    description:
      'Меняет сумму, количество занятий, дату, способ или комментарий проведённой оплаты. Количество занятий нельзя сделать меньше уже использованного.',
  })
  @ApiOkResponse({
    description: 'Оплата изменена.',
    standardSchema: paymentResponseSchema,
  })
  @ApiBadRequestResponse({ description: 'Дата оплаты в будущем.' })
  @ApiNotFoundResponse({ description: 'Оплата не найдена.' })
  @ApiConflictResponse({
    description:
      'Оплата отменена или количество занятий меньше уже использованного.',
  })
  updatePayment(
    @Session() session: UserSession,
    @Param('id', { schema: z.uuid() }) id: string,
    @Body({ schema: updatePaymentSchema }) body: UpdatePaymentDto,
  ): Promise<PaymentResponseDto> {
    return this.paymentsService.updatePayment(session, id, body);
  }

  @RequireActiveOrg()
  @OrgRoles(['owner', 'admin'])
  @Post(':id/cancel')
  @ApiOperation({
    summary: 'Отмена оплаты',
    description:
      'Переводит оплату в статус «Отменена» и аннулирует начисленный пакет. Оплата остаётся в истории. Если занятия из пакета уже списаны, отменить оплату нельзя.',
  })
  @ApiOkResponse({
    description: 'Оплата отменена.',
    standardSchema: paymentResponseSchema,
  })
  @ApiNotFoundResponse({ description: 'Оплата не найдена.' })
  @ApiConflictResponse({
    description: 'Оплата уже отменена или занятия из пакета уже списаны.',
  })
  cancelPayment(
    @Session() session: UserSession,
    @Param('id', { schema: z.uuid() }) id: string,
  ): Promise<PaymentResponseDto> {
    return this.paymentsService.cancelPayment(session, id);
  }
}
