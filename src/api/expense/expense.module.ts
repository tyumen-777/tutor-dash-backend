import { Module } from '@nestjs/common';

import { InfraModule } from '../../infra/infra.module.js';
import { ExpensesController } from './expenses.controller.js';
import { ExpensesService } from './expenses.service.js';

@Module({
  imports: [InfraModule],
  controllers: [ExpensesController],
  providers: [ExpensesService],
})
export class ExpenseModule {}
