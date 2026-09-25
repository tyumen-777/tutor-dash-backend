import { Module } from '@nestjs/common';

import { InfraModule } from '../../infra/infra.module.js';
import { SlugService } from '../auth/slug.js';
import { AdminController } from './admin.controller.js';
import { AdminService } from './admin.service.js';

@Module({
  imports: [InfraModule],
  controllers: [AdminController],
  providers: [AdminService, SlugService],
})
export class AdminModule {}
