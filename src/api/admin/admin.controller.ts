import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiCreatedResponse, ApiOperation } from '@nestjs/swagger';

import { AdminService } from './admin.service.js';
import { SaasAdminGuard } from './saas-admin.guard.js';
import {
  createOrganizationOwnerSchema,
  type CreateOrganizationOwnerDto,
} from './dto/create-organization-owner.dto.js';
import {
  organizationMemberResponseSchema,
  type OrganizationMemberResponseDto,
} from '../organization/dto/organization-member-response.dto.js';

// Все эндпоинты /admin/* доступны только SaaS-админу
@UseGuards(SaasAdminGuard)
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
    @Body({ schema: createOrganizationOwnerSchema })
    body: CreateOrganizationOwnerDto,
  ): Promise<OrganizationMemberResponseDto> {
    return this.adminService.createOrganizationOwner(body);
  }
}
