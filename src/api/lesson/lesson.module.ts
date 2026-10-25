import { Module } from '@nestjs/common';

import { InfraModule } from '../../infra/infra.module.js';
import { LessonsController } from './lessons.controller.js';
import { LessonsService } from './lessons.service.js';

@Module({
  imports: [InfraModule],
  controllers: [LessonsController],
  providers: [LessonsService],
})
export class LessonModule {}
