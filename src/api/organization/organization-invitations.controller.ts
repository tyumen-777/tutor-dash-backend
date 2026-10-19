import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
} from '@nestjs/swagger';
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
import {
  invitationResponseSchema,
  type InvitationResponseDto,
} from './dto/invitation-response.dto.js';
import {
  organizationMemberResponseSchema,
  type OrganizationMemberResponseDto,
} from './dto/organization-member-response.dto.js';
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
  @ApiCreatedResponse({
    description: 'Приглашение создано.',
    standardSchema: invitationResponseSchema,
  })
  createInvitation(
    @Session() session: UserSession,
    @Body({ schema: createInvitationSchema }) body: CreateInvitationDto,
  ): Promise<InvitationResponseDto> {
    return this.invitationsService.createInvitation(session, body);
  }

  @AllowAnonymous()
  @Get(':id')
  @ApiOperation({
    summary: 'Получение приглашения',
    description:
      'Возвращает публичные данные приглашения по его идентификатору.',
  })
  @ApiOkResponse({
    description: 'Данные приглашения.',
    standardSchema: invitationResponseSchema,
  })
  getInvitation(@Param('id') id: string): Promise<InvitationResponseDto> {
    return this.invitationsService.getInvitation(id);
  }

  @AllowAnonymous()
  @Post(':id/accept')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Принятие приглашения',
    description:
      'Принимает приглашение в организацию и при необходимости создает или обновляет учетную запись пользователя.',
  })
  @ApiOkResponse({
    description:
      'Приглашение принято. Cookie сессии установлена в заголовке Set-Cookie.',
    standardSchema: organizationMemberResponseSchema,
  })
  acceptInvitation(
    @Param('id') id: string,
    @Body({ schema: acceptInvitationSchema }) body: AcceptInvitationDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<OrganizationMemberResponseDto> {
    return this.invitationsService.acceptInvitation(
      id,
      body,
      request,
      response,
    );
  }
}
