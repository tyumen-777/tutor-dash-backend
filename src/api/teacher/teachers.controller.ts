import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import {
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
import { z } from 'zod';

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
      'Возвращает учителей активной организации с поиском, фильтром по статусу и пагинацией. Сортировка по ФИО.',
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
  createTeacher(
    @Session() session: UserSession,
    @Body({ schema: createTeacherSchema }) body: CreateTeacherDto,
  ): Promise<TeacherResponseDto> {
    return this.teachersService.createTeacher(session, body);
  }
}
