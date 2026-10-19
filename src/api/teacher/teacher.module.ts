import { Module } from '@nestjs/common';

import { InfraModule } from '../../infra/infra.module.js';
import { TeachersController } from './teachers.controller.js';
import { TeachersService } from './teachers.service.js';

@Module({
  imports: [InfraModule],
  controllers: [TeachersController],
  providers: [TeachersService],
})
export class TeacherModule {}
