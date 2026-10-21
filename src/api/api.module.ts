import { Module } from '@nestjs/common';
import { AdminModule } from './admin/admin.module.js';
import { BackendAuthModule } from './auth/backend-auth.module.js';
import { HealthModule } from './health/health.module.js';
import { OrganizationModule } from './organization/organization.module.js';
import { TeacherModule } from './teacher/teacher.module.js';

@Module({
  imports: [
    BackendAuthModule,
    AdminModule,
    OrganizationModule,
    TeacherModule,
    HealthModule,
  ],
})
export class ApiModule {}
