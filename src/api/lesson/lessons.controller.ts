import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
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
  cancelLessonSchema,
  type CancelLessonDto,
} from './dto/cancel-lesson.dto.js';
import {
  createLessonSchema,
  type CreateLessonDto,
} from './dto/create-lesson.dto.js';
import {
  lessonListResponseSchema,
  type LessonListResponseDto,
  lessonResponseSchema,
  type LessonResponseDto,
} from './dto/lesson-response.dto.js';
import {
  listLessonsQuerySchema,
  type ListLessonsQueryDto,
} from './dto/list-lessons-query.dto.js';
import { LessonsService } from './lessons.service.js';

@Controller('lessons')
export class LessonsController {
  constructor(private readonly lessonsService: LessonsService) {}

  @RequireActiveOrg()
  @OrgRoles(['owner', 'admin', 'manager', 'accountant'])
  @Get()
  @ApiOperation({
    summary: 'Список занятий',
    description:
      'Возвращает занятия активной организации с фильтрами по периоду, преподавателю, ученику и статусу, пагинацией и итогами: проведённые занятия, начисления преподавателям и отмены. Сортировка от новых к старым.',
  })
  @ApiOkResponse({
    description: 'Страница занятий с итогами.',
    standardSchema: lessonListResponseSchema,
  })
  listLessons(
    @Session() session: UserSession,
    @Query({ schema: listLessonsQuerySchema }) query: ListLessonsQueryDto,
  ): Promise<LessonListResponseDto> {
    return this.lessonsService.listLessons(session, query);
  }

  @RequireActiveOrg()
  @OrgRoles(['owner', 'admin', 'manager', 'accountant'])
  @Get(':id')
  @ApiOperation({
    summary: 'Получение занятия',
    description: 'Возвращает занятие активной организации по идентификатору.',
  })
  @ApiOkResponse({
    description: 'Данные занятия.',
    standardSchema: lessonResponseSchema,
  })
  @ApiNotFoundResponse({ description: 'Занятие не найдено.' })
  getLesson(
    @Session() session: UserSession,
    @Param('id', { schema: z.uuid() }) id: string,
  ): Promise<LessonResponseDto> {
    return this.lessonsService.getLesson(session, id);
  }

  @RequireActiveOrg()
  @OrgRoles(['owner', 'admin', 'manager'])
  @Post()
  @ApiOperation({
    summary: 'Внесение проведённого занятия',
    description:
      'Регистрирует проведённое занятие длительностью 45 или 60 минут: списывает одно занятие с самого раннего активного пакета ученика и начисляет преподавателю оплату по его ставке за час. За 45 минут начисляется ставка / 60 × 45 с округлением вверх до 10.',
  })
  @ApiCreatedResponse({
    description: 'Занятие внесено, занятие у ученика списано.',
    standardSchema: lessonResponseSchema,
  })
  @ApiBadRequestResponse({
    description:
      'Ученик или преподаватель не найден либо в архиве, или занятие в будущем.',
  })
  @ApiConflictResponse({ description: 'У ученика нет оплаченных занятий.' })
  createLesson(
    @Session() session: UserSession,
    @Body({ schema: createLessonSchema }) body: CreateLessonDto,
  ): Promise<LessonResponseDto> {
    return this.lessonsService.createLesson(session, body);
  }

  @RequireActiveOrg()
  @OrgRoles(['owner', 'admin', 'manager'])
  @Post(':id/cancel')
  @ApiOperation({
    summary: 'Отмена занятия',
    description:
      'Переводит проведённое занятие в статус «Отменено»: занятие возвращается ученику в пакет, начисление преподавателю больше не учитывается. Занятие остаётся в истории.',
  })
  @ApiOkResponse({
    description: 'Занятие отменено.',
    standardSchema: lessonResponseSchema,
  })
  @ApiNotFoundResponse({ description: 'Занятие не найдено.' })
  @ApiConflictResponse({ description: 'Занятие уже отменено.' })
  cancelLesson(
    @Session() session: UserSession,
    @Param('id', { schema: z.uuid() }) id: string,
    @Body({ schema: cancelLessonSchema }) body: CancelLessonDto,
  ): Promise<LessonResponseDto> {
    return this.lessonsService.cancelLesson(session, id, body);
  }
}
