import { Controller, Get, Query } from '@nestjs/common';
import {
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
  teacherResponseSchema,
  type TeacherResponseDto,
} from '../teacher/dto/teacher-response.dto.js';
import {
  myEarningsQuerySchema,
  type MyEarningsQueryDto,
  myEarningsResponseSchema,
  type MyEarningsResponseDto,
} from './dto/my-earnings.dto.js';
import { MeService } from './me.service.js';

// Личный кабинет: любой участник школы, к которому привязана карточка учителя
const ALL_ROLES = ['owner', 'admin', 'manager', 'accountant', 'teacher'];

@Controller('me')
export class MeController {
  constructor(private readonly meService: MeService) {}

  @RequireActiveOrg()
  @OrgRoles(ALL_ROLES)
  @Get('teacher')
  @ApiOperation({
    summary: 'Моя карточка преподавателя',
    description:
      'Карточка преподавателя, привязанная к текущему пользователю: контакты, ставка, даты работы.',
  })
  @ApiOkResponse({
    description: 'Карточка преподавателя.',
    standardSchema: teacherResponseSchema,
  })
  @ApiNotFoundResponse({
    description: 'К пользователю не привязана карточка преподавателя.',
  })
  getTeacher(@Session() session: UserSession): Promise<TeacherResponseDto> {
    return this.meService.getTeacher(session);
  }

  @RequireActiveOrg()
  @OrgRoles(ALL_ROLES)
  @Get('earnings')
  @ApiOperation({
    summary: 'Мой заработок',
    description:
      'Начислено за период по проведённым занятиям, сколько из этого выплачено, остаток к выплате, долг за прошлые периоды и выплаты за период. Только свои занятия и выплаты.',
  })
  @ApiOkResponse({
    description: 'Заработок за период.',
    standardSchema: myEarningsResponseSchema,
  })
  @ApiNotFoundResponse({
    description: 'К пользователю не привязана карточка преподавателя.',
  })
  getEarnings(
    @Session() session: UserSession,
    @Query({ schema: myEarningsQuerySchema }) query: MyEarningsQueryDto,
  ): Promise<MyEarningsResponseDto> {
    return this.meService.getEarnings(session, query);
  }
}
