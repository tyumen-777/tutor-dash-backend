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
  createStudentSchema,
  type CreateStudentDto,
} from './dto/create-student.dto.js';
import {
  listStudentsQuerySchema,
  type ListStudentsQueryDto,
} from './dto/list-students-query.dto.js';
import {
  studentBalanceResponseSchema,
  type StudentBalanceResponseDto,
  studentListResponseSchema,
  type StudentListResponseDto,
  studentResponseSchema,
  type StudentResponseDto,
} from './dto/student-response.dto.js';
import { StudentsService } from './students.service.js';

@Controller('students')
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @RequireActiveOrg()
  @OrgRoles(['owner', 'admin', 'manager', 'accountant'])
  @Get()
  @ApiOperation({
    summary: 'Список учеников',
    description:
      'Возвращает учеников активной организации с поиском, фильтрами по статусу и преподавателю и пагинацией. Без фильтра архивные ученики не показываются. Сортировка по фамилии и имени.',
  })
  @ApiOkResponse({
    description: 'Страница учеников.',
    standardSchema: studentListResponseSchema,
  })
  listStudents(
    @Session() session: UserSession,
    @Query({ schema: listStudentsQuerySchema }) query: ListStudentsQueryDto,
  ): Promise<StudentListResponseDto> {
    return this.studentsService.listStudents(session, query);
  }

  @RequireActiveOrg()
  @OrgRoles(['owner', 'admin', 'manager', 'accountant'])
  @Get(':id')
  @ApiOperation({
    summary: 'Получение ученика',
    description: 'Возвращает ученика активной организации по идентификатору.',
  })
  @ApiOkResponse({
    description: 'Данные ученика.',
    standardSchema: studentResponseSchema,
  })
  @ApiNotFoundResponse({ description: 'Ученик не найден.' })
  getStudent(
    @Session() session: UserSession,
    @Param('id', { schema: z.uuid() }) id: string,
  ): Promise<StudentResponseDto> {
    return this.studentsService.getStudent(session, id);
  }

  @RequireActiveOrg()
  @OrgRoles(['owner', 'admin', 'manager', 'accountant'])
  @Get(':id/balance')
  @ApiOperation({
    summary: 'Баланс занятий ученика',
    description:
      'Возвращает, сколько занятий начислено по оплаченным пакетам, сколько использовано и сколько осталось, а также дату последней оплаты. Отменённые пакеты не учитываются.',
  })
  @ApiOkResponse({
    description: 'Баланс занятий.',
    standardSchema: studentBalanceResponseSchema,
  })
  @ApiNotFoundResponse({ description: 'Ученик не найден.' })
  getStudentBalance(
    @Session() session: UserSession,
    @Param('id', { schema: z.uuid() }) id: string,
  ): Promise<StudentBalanceResponseDto> {
    return this.studentsService.getStudentBalance(session, id);
  }

  @RequireActiveOrg()
  @OrgRoles(['owner', 'admin', 'manager'])
  @Post()
  @ApiOperation({
    summary: 'Добавление ученика',
    description:
      'Добавляет ученика в активную организацию: имя, фамилия, контакты и Telegram, основной преподаватель, уровень, дата рождения, часовой пояс, начальный статус (лид или активный) и заметка.',
  })
  @ApiCreatedResponse({
    description: 'Ученик добавлен.',
    standardSchema: studentResponseSchema,
  })
  @ApiBadRequestResponse({
    description:
      'Преподаватель не найден в организации или находится в архиве.',
  })
  createStudent(
    @Session() session: UserSession,
    @Body({ schema: createStudentSchema }) body: CreateStudentDto,
  ): Promise<StudentResponseDto> {
    return this.studentsService.createStudent(session, body);
  }

  @RequireActiveOrg()
  @OrgRoles(['owner', 'admin'])
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Удаление ученика',
    description:
      'Физически удаляет ученика, созданного по ошибке, вместе с его шаблонами расписания и связями с родителями. Ученика, у которого есть занятия, абонементы или платежи, удалить нельзя: его нужно перевести в архив.',
  })
  @ApiNoContentResponse({ description: 'Ученик удален.' })
  @ApiNotFoundResponse({ description: 'Ученик не найден.' })
  @ApiConflictResponse({
    description: 'У ученика есть занятия, абонементы или платежи.',
  })
  deleteStudent(
    @Session() session: UserSession,
    @Param('id', { schema: z.uuid() }) id: string,
  ): Promise<void> {
    return this.studentsService.deleteStudent(session, id);
  }
}
