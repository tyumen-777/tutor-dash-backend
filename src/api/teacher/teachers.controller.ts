import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
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
import { z } from 'zod';

import {
  archiveTeacherSchema,
  type ArchiveTeacherDto,
} from './dto/archive-teacher.dto.js';
import {
  createTeacherSchema,
  type CreateTeacherDto,
} from './dto/create-teacher.dto.js';
import {
  listTeachersQuerySchema,
  type ListTeachersQueryDto,
} from './dto/list-teachers-query.dto.js';
import {
  teacherListResponseSchema,
  type TeacherListResponseDto,
  teacherResponseSchema,
  type TeacherResponseDto,
} from './dto/teacher-response.dto.js';
import { TeachersService } from './teachers.service.js';

@Controller('teachers')
export class TeachersController {
  constructor(private readonly teachersService: TeachersService) {}

  @RequireActiveOrg()
  @OrgRoles(['owner', 'admin', 'manager', 'accountant'])
  @Get()
  @ApiOperation({
    summary: 'Список учителей',
    description:
      'Возвращает учителей активной организации с поиском, фильтром по статусу (активные, архив, все) и пагинацией. Сортировка по ФИО.',
  })
  @ApiOkResponse({
    description: 'Страница учителей.',
    standardSchema: teacherListResponseSchema,
  })
  listTeachers(
    @Session() session: UserSession,
    @Query({ schema: listTeachersQuerySchema }) query: ListTeachersQueryDto,
  ): Promise<TeacherListResponseDto> {
    return this.teachersService.listTeachers(session, query);
  }

  @RequireActiveOrg()
  @OrgRoles(['owner', 'admin', 'manager', 'accountant'])
  @Get(':id')
  @ApiOperation({
    summary: 'Получение учителя',
    description: 'Возвращает учителя активной организации по идентификатору.',
  })
  @ApiOkResponse({
    description: 'Данные учителя.',
    standardSchema: teacherResponseSchema,
  })
  getTeacher(
    @Session() session: UserSession,
    @Param('id', { schema: z.uuid() }) id: string,
  ): Promise<TeacherResponseDto> {
    return this.teachersService.getTeacher(session, id);
  }

  @RequireActiveOrg()
  @OrgRoles(['owner', 'admin'])
  @Post()
  @ApiOperation({
    summary: 'Добавление учителя',
    description:
      'Добавляет учителя в активную организацию: ФИО, почта, телефон, Telegram, ставка в час и дата начала работы.',
  })
  @ApiCreatedResponse({
    description: 'Учитель добавлен.',
    standardSchema: teacherResponseSchema,
  })
  @ApiConflictResponse({
    description:
      'Учитель с такой почтой уже есть. Если он в архиве, в ответе есть archivedTeacherId для восстановления.',
  })
  createTeacher(
    @Session() session: UserSession,
    @Body({ schema: createTeacherSchema }) body: CreateTeacherDto,
  ): Promise<TeacherResponseDto> {
    return this.teachersService.createTeacher(session, body);
  }

  @RequireActiveOrg()
  @OrgRoles(['owner', 'admin'])
  @Post(':id/archive')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Перевод учителя в архив',
    description:
      'Увольняет учителя: сохраняет дату увольнения, отменяет его будущие запланированные занятия и закрывает шаблоны расписания текущей датой. Прошедшие занятия остаются в истории.',
  })
  @ApiOkResponse({
    description: 'Учитель переведен в архив.',
    standardSchema: teacherResponseSchema,
  })
  @ApiBadRequestResponse({
    description: 'Дата увольнения в будущем или раньше даты начала работы.',
  })
  @ApiConflictResponse({ description: 'Учитель уже в архиве.' })
  archiveTeacher(
    @Session() session: UserSession,
    @Param('id', { schema: z.uuid() }) id: string,
    @Body({ schema: archiveTeacherSchema }) body: ArchiveTeacherDto,
  ): Promise<TeacherResponseDto> {
    return this.teachersService.archiveTeacher(session, id, body);
  }

  @RequireActiveOrg()
  @OrgRoles(['owner', 'admin'])
  @Post(':id/restore')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Восстановление учителя из архива',
    description:
      'Возвращает учителя из архива вместе со всей историей занятий. Расписание нужно составить заново.',
  })
  @ApiOkResponse({
    description: 'Учитель восстановлен.',
    standardSchema: teacherResponseSchema,
  })
  @ApiConflictResponse({
    description:
      'Учитель не в архиве или уже есть активный учитель с такой почтой.',
  })
  restoreTeacher(
    @Session() session: UserSession,
    @Param('id', { schema: z.uuid() }) id: string,
  ): Promise<TeacherResponseDto> {
    return this.teachersService.restoreTeacher(session, id);
  }

  @RequireActiveOrg()
  @OrgRoles(['owner', 'admin'])
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Удаление учителя',
    description:
      'Физически удаляет учителя, созданного по ошибке. Учителя, у которого есть занятия или шаблоны расписания, удалить нельзя: его нужно перевести в архив.',
  })
  @ApiNoContentResponse({ description: 'Учитель удален.' })
  @ApiNotFoundResponse({ description: 'Учитель не найден.' })
  @ApiConflictResponse({
    description: 'У учителя есть занятия или шаблоны расписания.',
  })
  deleteTeacher(
    @Session() session: UserSession,
    @Param('id', { schema: z.uuid() }) id: string,
  ): Promise<void> {
    return this.teachersService.deleteTeacher(session, id);
  }
}
