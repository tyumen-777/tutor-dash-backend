import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import {
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
  createStudyLevelSchema,
  type CreateStudyLevelDto,
} from './dto/create-study-level.dto.js';
import {
  studyLevelListResponseSchema,
  type StudyLevelListResponseDto,
  studyLevelResponseSchema,
  type StudyLevelResponseDto,
} from './dto/study-level-response.dto.js';
import {
  updateStudyLevelSchema,
  type UpdateStudyLevelDto,
} from './dto/update-study-level.dto.js';
import { StudyLevelsService } from './study-levels.service.js';

@Controller('study-levels')
export class StudyLevelsController {
  constructor(private readonly studyLevelsService: StudyLevelsService) {}

  @RequireActiveOrg()
  @OrgRoles(['owner', 'admin', 'manager', 'accountant', 'teacher'])
  @Get()
  @ApiOperation({
    summary: 'Список уровней обучения',
    description:
      'Возвращает все уровни обучения активной организации с количеством учеников на каждом. Сортировка по обозначению.',
  })
  @ApiOkResponse({
    description: 'Уровни обучения.',
    standardSchema: studyLevelListResponseSchema,
  })
  listStudyLevels(
    @Session() session: UserSession,
  ): Promise<StudyLevelListResponseDto> {
    return this.studyLevelsService.listStudyLevels(session);
  }

  @RequireActiveOrg()
  @OrgRoles(['owner', 'admin'])
  @Post()
  @ApiOperation({
    summary: 'Создание уровня обучения',
    description:
      'Добавляет уровень обучения: обозначение (например, A1) и название (Beginner). Обозначение уникально в пределах школы.',
  })
  @ApiCreatedResponse({
    description: 'Уровень создан.',
    standardSchema: studyLevelResponseSchema,
  })
  @ApiConflictResponse({
    description: 'Уровень с таким обозначением уже есть.',
  })
  createStudyLevel(
    @Session() session: UserSession,
    @Body({ schema: createStudyLevelSchema }) body: CreateStudyLevelDto,
  ): Promise<StudyLevelResponseDto> {
    return this.studyLevelsService.createStudyLevel(session, body);
  }

  @RequireActiveOrg()
  @OrgRoles(['owner', 'admin'])
  @Patch(':id')
  @ApiOperation({
    summary: 'Изменение уровня обучения',
    description:
      'Меняет обозначение или название уровня. Ученики с этим уровнем сразу видят новые значения.',
  })
  @ApiOkResponse({
    description: 'Уровень изменён.',
    standardSchema: studyLevelResponseSchema,
  })
  @ApiNotFoundResponse({ description: 'Уровень не найден.' })
  @ApiConflictResponse({
    description: 'Уровень с таким обозначением уже есть.',
  })
  updateStudyLevel(
    @Session() session: UserSession,
    @Param('id', { schema: z.uuid() }) id: string,
    @Body({ schema: updateStudyLevelSchema }) body: UpdateStudyLevelDto,
  ): Promise<StudyLevelResponseDto> {
    return this.studyLevelsService.updateStudyLevel(session, id, body);
  }

  @RequireActiveOrg()
  @OrgRoles(['owner', 'admin'])
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Удаление уровня обучения',
    description:
      'Удаляет уровень, который не назначен ни одному ученику. Сначала смените уровень у учеников.',
  })
  @ApiNoContentResponse({ description: 'Уровень удалён.' })
  @ApiNotFoundResponse({ description: 'Уровень не найден.' })
  @ApiConflictResponse({ description: 'Уровень назначен ученикам.' })
  deleteStudyLevel(
    @Session() session: UserSession,
    @Param('id', { schema: z.uuid() }) id: string,
  ): Promise<void> {
    return this.studyLevelsService.deleteStudyLevel(session, id);
  }
}
