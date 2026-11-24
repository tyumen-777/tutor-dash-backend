import { Module } from '@nestjs/common';

import { InfraModule } from '../../infra/infra.module.js';
import { PeriodLocksController } from './period-locks.controller.js';
import { PeriodLocksService } from './period-locks.service.js';

@Module({
  imports: [InfraModule],
  controllers: [PeriodLocksController],
  providers: [PeriodLocksService],
})
export class PeriodLockModule {}
