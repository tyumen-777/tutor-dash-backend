import { Body, Controller, Get, Param, Post, Req, Res } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import {
  AllowAnonymous,
  OrgRoles,
  RequireActiveOrg,
  Session,
  type UserSession,
} from '@thallesp/nestjs-better-auth';
import type { Request, Response } from 'express';

import {
  acceptInvitationSchema,
  type AcceptInvitationDto,
} from './dto/accept-invitation.dto.js';
import {
  createInvitationSchema,
  type CreateInvitationDto,
} from './dto/create-invitation.dto.js';
import { OrganizationInvitationsService } from './organization-invitations.service.js';

@Controller('organization/invitations')
export class OrganizationInvitationsController {
  constructor(
    private readonly invitationsService: OrganizationInvitationsService,
  ) {}

  @RequireActiveOrg()
  @OrgRoles(['owner', 'admin'])
  @Post()
  @ApiOperation({
    summary: 'Создание приглашения в организацию',
    description:
      'Создает приглашение для пользователя в активную организацию с указанной ролью.',
  })
  createInvitation(
    @Session() session: UserSession,
    @Body({ schema: createInvitationSchema }) body: CreateInvitationDto,
  ) {
    return this.invitationsService.createInvitation(session, body);
  }

  @AllowAnonymous()
  @Get(':id')
  @ApiOperation({
    summary: 'Получение приглашения',
    description:
      'Возвращает публичные данные приглашения по его идентификатору.',
  })
  getInvitation(@Param('id') id: string) {
    return this.invitationsService.getInvitation(id);
  }

  @AllowAnonymous()
  @Post(':id/accept')
  @ApiOperation({
    summary: 'Принятие приглашения',
    description:
      'Принимает приглашение в организацию и при необходимости создает или обновляет учетную запись пользователя.',
  })
  acceptInvitation(
    @Param('id') id: string,
    @Body({ schema: acceptInvitationSchema }) body: AcceptInvitationDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.invitationsService.acceptInvitation(
      id,
      body,
      request,
      response,
    );
  }
}
