import { Module } from '@nestjs/common';

import { InfraModule } from '../../infra/infra.module.js';
import { OrganizationInvitationsController } from './organization-invitations.controller.js';
import { OrganizationInvitationsService } from './organization-invitations.service.js';

@Module({
  imports: [InfraModule],
  controllers: [OrganizationInvitationsController],
  providers: [OrganizationInvitationsService],
})
export class OrganizationModule {}
