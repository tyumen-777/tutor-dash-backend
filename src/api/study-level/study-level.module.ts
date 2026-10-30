import { Module } from '@nestjs/common';

import { InfraModule } from '../../infra/infra.module.js';
import { StudyLevelsController } from './study-levels.controller.js';
import { StudyLevelsService } from './study-levels.service.js';

@Module({
  imports: [InfraModule],
  controllers: [StudyLevelsController],
  providers: [StudyLevelsService],
})
export class StudyLevelModule {}
