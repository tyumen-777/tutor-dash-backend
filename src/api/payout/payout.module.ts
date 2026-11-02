import { Module } from '@nestjs/common';

import { InfraModule } from '../../infra/infra.module.js';
import { ExpenseModule } from '../expense/expense.module.js';
import { PayoutsController } from './payouts.controller.js';
import { PayoutsService } from './payouts.service.js';

@Module({
  imports: [InfraModule, ExpenseModule],
  controllers: [PayoutsController],
  providers: [PayoutsService],
})
export class PayoutModule {}
