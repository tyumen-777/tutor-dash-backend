import { Body, Controller, Post } from '@nestjs/common';
import { ApiCreatedResponse, ApiOperation } from '@nestjs/swagger';
import { Session, type UserSession } from '@thallesp/nestjs-better-auth';

import { AdminService } from './admin.service.js';
import {
  createOrganizationOwnerSchema,
  type CreateOrganizationOwnerDto,
} from './dto/create-organization-owner.dto.js';
import {
  organizationMemberResponseSchema,
  type OrganizationMemberResponseDto,
} from '../organization/dto/organization-member-response.dto.js';

@Controller('admin/organizations')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post()
  @ApiOperation({
    summary: 'Создание организации с владельцем',
    description:
      'Создает новую организацию и первого пользователя-владельца от имени администратора.',
  })
  @ApiCreatedResponse({
    description: 'Организация и ее владелец созданы.',
    standardSchema: organizationMemberResponseSchema,
  })
  createOrganizationOwner(
    @Session() session: UserSession,
    @Body({ schema: createOrganizationOwnerSchema })
    body: CreateOrganizationOwnerDto,
  ): Promise<OrganizationMemberResponseDto> {
    return this.adminService.createOrganizationOwner(session.user, body);
  }
}
