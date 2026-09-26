import { Module } from '@nestjs/common';
import { AdminModule } from './admin/admin.module.js';
import { BackendAuthModule } from './auth/backend-auth.module.js';
import { OrganizationModule } from './organization/organization.module.js';

@Module({
  imports: [BackendAuthModule, AdminModule, OrganizationModule],
})
export class ApiModule {}
