import { Module } from '@nestjs/common';

import { InfraModule } from '../../infra/infra.module.js';
import { PaymentsController } from './payments.controller.js';
import { PaymentsService } from './payments.service.js';

@Module({
  imports: [InfraModule],
  controllers: [PaymentsController],
  providers: [PaymentsService],
})
export class PaymentModule {}
