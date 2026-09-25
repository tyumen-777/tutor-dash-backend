import { Module } from '@nestjs/common';
import { AdminModule } from './admin/admin.module.js';
import { BackendAuthModule } from './auth/backend-auth.module.js';

@Module({
  imports: [BackendAuthModule, AdminModule],
})
export class ApiModule {}
