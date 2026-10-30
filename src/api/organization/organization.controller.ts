import { Body, Controller, Get, Patch } from '@nestjs/common';
import {
  ApiBadRequestResponse,
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
  organizationSettingsResponseSchema,
  type OrganizationSettingsResponseDto,
} from './dto/organization-settings-response.dto.js';
import {
  updateOrganizationSchema,
  type UpdateOrganizationDto,
} from './dto/update-organization.dto.js';
import { OrganizationService } from './organization.service.js';

@Controller('organization')
export class OrganizationController {
  constructor(private readonly organizationService: OrganizationService) {}

  @RequireActiveOrg()
  @OrgRoles(['owner', 'admin', 'manager', 'accountant', 'teacher'])
  @Get()
  @ApiOperation({
    summary: 'Реквизиты школы',
    description:
      'Возвращает название, адрес (slug), часовой пояс и валюту активной организации.',
  })
  @ApiOkResponse({
    description: 'Реквизиты школы.',
    standardSchema: organizationSettingsResponseSchema,
  })
  getOrganization(
    @Session() session: UserSession,
  ): Promise<OrganizationSettingsResponseDto> {
    return this.organizationService.getOrganization(session);
  }

  @RequireActiveOrg()
  @OrgRoles(['owner', 'admin'])
  @Patch()
  @ApiOperation({
    summary: 'Изменение реквизитов школы',
    description:
      'Меняет название и часовой пояс активной организации. Валюта и slug не меняются: валюта записана в каждой оплате и расходе.',
  })
  @ApiOkResponse({
    description: 'Реквизиты изменены.',
    standardSchema: organizationSettingsResponseSchema,
  })
  @ApiBadRequestResponse({
    description: 'Пустое название, неизвестный часовой пояс или лишние поля.',
  })
  updateOrganization(
    @Session() session: UserSession,
    @Body({ schema: updateOrganizationSchema }) body: UpdateOrganizationDto,
  ): Promise<OrganizationSettingsResponseDto> {
    return this.organizationService.updateOrganization(session, body);
  }
}
