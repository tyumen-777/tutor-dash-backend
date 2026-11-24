import { Module } from '@nestjs/common';

import { InfraModule } from '../../infra/infra.module.js';
import { FinanceLogsController } from './finance-logs.controller.js';
import { FinanceLogsService } from './finance-logs.service.js';

@Module({
  imports: [InfraModule],
  controllers: [FinanceLogsController],
  providers: [FinanceLogsService],
})
export class FinanceLogModule {}
