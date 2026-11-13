import { Module } from '@nestjs/common';

import { InfraModule } from '../../infra/infra.module.js';
import { TeacherAccessController } from './teacher-access.controller.js';
import { TeacherAccessService } from './teacher-access.service.js';
import { TeachersController } from './teachers.controller.js';
import { TeachersService } from './teachers.service.js';

@Module({
  imports: [InfraModule],
  controllers: [TeachersController, TeacherAccessController],
  providers: [TeachersService, TeacherAccessService],
  exports: [TeachersService],
})
export class TeacherModule {}
