import { Module } from '@nestjs/common';

import { InfraModule } from '../../infra/infra.module.js';
import { OrganizationInvitationsController } from './organization-invitations.controller.js';
import { OrganizationInvitationsService } from './organization-invitations.service.js';
import { OrganizationController } from './organization.controller.js';
import { OrganizationService } from './organization.service.js';

@Module({
  imports: [InfraModule],
  controllers: [OrganizationController, OrganizationInvitationsController],
  providers: [OrganizationService, OrganizationInvitationsService],
})
export class OrganizationModule {}
