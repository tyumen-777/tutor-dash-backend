import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { Session, type UserSession } from '@thallesp/nestjs-better-auth';

import { AdminService } from './admin.service.js';
import {
  createOrganizationOwnerSchema,
  type CreateOrganizationOwnerDto,
} from './dto/create-organization-owner.dto.js';

@Controller('admin/organizations')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post()
  @ApiOperation({
    summary: 'Создание организации с владельцем',
    description:
      'Создает новую организацию и первого пользователя-владельца от имени администратора.',
  })
  createOrganizationOwner(
    @Session() session: UserSession,
    @Body({ schema: createOrganizationOwnerSchema })
    body: CreateOrganizationOwnerDto,
  ) {
    return this.adminService.createOrganizationOwner(session.user, body);
  }
}
