import { Module } from '@nestjs/common';
import { AdminModule } from './admin/admin.module.js';
import { BackendAuthModule } from './auth/backend-auth.module.js';
import { HealthModule } from './health/health.module.js';
import { LessonModule } from './lesson/lesson.module.js';
import { OrganizationModule } from './organization/organization.module.js';
import { PaymentModule } from './payment/payment.module.js';
import { StudentModule } from './student/student.module.js';
import { TeacherModule } from './teacher/teacher.module.js';

@Module({
  imports: [
    BackendAuthModule,
    AdminModule,
    OrganizationModule,
    TeacherModule,
    StudentModule,
    PaymentModule,
    LessonModule,
    HealthModule,
  ],
})
export class ApiModule {}
