import { Body, Controller, Post } from '@nestjs/common';
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
  createOrganizationOwner(
    @Session() session: UserSession,
    @Body({ schema: createOrganizationOwnerSchema })
    body: CreateOrganizationOwnerDto,
  ) {
    return this.adminService.createOrganizationOwner(session.user, body);
  }
}
