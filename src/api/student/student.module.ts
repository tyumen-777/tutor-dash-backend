import { Module } from '@nestjs/common';

import { InfraModule } from '../../infra/infra.module.js';
import { StudentsController } from './students.controller.js';
import { StudentsService } from './students.service.js';

@Module({
  imports: [InfraModule],
  controllers: [StudentsController],
  providers: [StudentsService],
})
export class StudentModule {}
