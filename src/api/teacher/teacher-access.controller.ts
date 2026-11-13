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
  inviteTeacherSchema,
  type InviteTeacherDto,
  teacherAccessResponseSchema,
  type TeacherAccessResponseDto,
} from './dto/teacher-access.dto.js';
import { TeacherAccessService } from './teacher-access.service.js';

@Controller('teachers/:id/access')
export class TeacherAccessController {
  constructor(private readonly accessService: TeacherAccessService) {}

  @RequireActiveOrg()
  @OrgRoles(['owner', 'admin'])
  @Get()
  @ApiOperation({
    summary: 'Доступ учителя в личный кабинет',
    description:
      'Показывает, есть ли у учителя вход в личный кабинет или ожидающее приглашение.',
  })
  @ApiOkResponse({
    description: 'Состояние доступа.',
    standardSchema: teacherAccessResponseSchema,
  })
  @ApiNotFoundResponse({ description: 'Учитель не найден.' })
  getAccess(
    @Session() session: UserSession,
    @Param('id', { schema: z.uuid() }) id: string,
  ): Promise<TeacherAccessResponseDto> {
    return this.accessService.getAccess(session, id);
  }

  @RequireActiveOrg()
  @OrgRoles(['owner', 'admin'])
  @Post('invite')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Приглашение учителя в личный кабинет',
    description:
      'Создаёт приглашение с ролью teacher, привязанное к карточке учителя; прежнее приглашение отменяется. Если пользователь с этой почтой уже состоит в школе, карточка сразу привязывается к нему.',
  })
  @ApiOkResponse({
    description: 'Состояние доступа после приглашения.',
    standardSchema: teacherAccessResponseSchema,
  })
  @ApiBadRequestResponse({ description: 'У учителя не указана почта.' })
  @ApiConflictResponse({
    description:
      'Учитель в архиве, уже имеет доступ, или на эту почту есть другое приглашение.',
  })
  invite(
    @Session() session: UserSession,
    @Param('id', { schema: z.uuid() }) id: string,
    @Body({ schema: inviteTeacherSchema }) body: InviteTeacherDto,
  ): Promise<TeacherAccessResponseDto> {
    return this.accessService.invite(session, id, body);
  }

  @RequireActiveOrg()
  @OrgRoles(['owner', 'admin'])
  @Delete()
  @ApiOperation({
    summary: 'Закрытие доступа учителя',
    description:
      'Отменяет приглашение и отвязывает учётную запись. Участник только с ролью teacher удаляется из школы.',
  })
  @ApiOkResponse({
    description: 'Состояние доступа после закрытия.',
    standardSchema: teacherAccessResponseSchema,
  })
  revoke(
    @Session() session: UserSession,
    @Param('id', { schema: z.uuid() }) id: string,
  ): Promise<TeacherAccessResponseDto> {
    return this.accessService.revoke(session, id);
  }
}
