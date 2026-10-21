import { Module } from '@nestjs/common';

import { InfraModule } from '../../infra/infra.module.js';
import { HealthController } from './health.controller.js';

@Module({
  imports: [InfraModule],
  controllers: [HealthController],
})
export class HealthModule {}
