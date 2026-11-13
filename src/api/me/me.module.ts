import { Module } from '@nestjs/common';

import { InfraModule } from '../../infra/infra.module.js';
import { PayoutModule } from '../payout/payout.module.js';
import { TeacherModule } from '../teacher/teacher.module.js';
import { MeController } from './me.controller.js';
import { MeService } from './me.service.js';

@Module({
  imports: [InfraModule, TeacherModule, PayoutModule],
  controllers: [MeController],
  providers: [MeService],
})
export class MeModule {}
