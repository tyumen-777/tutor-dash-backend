import { z } from 'zod';

import {
  clearableText,
  teacherEmailSchema,
  teacherFullNameSchema,
  teacherHourlyRateSchema,
  teacherPhoneSchema,
  teacherStartedOnSchema,
  teacherTelegramSchema,
} from './create-teacher.dto.js';

export const updateTeacherSchema = z
  .object({
    fullName: teacherFullNameSchema.optional(),
    // Пустая строка или null очищает поле
    email: clearableText(teacherEmailSchema),
    phone: clearableText(teacherPhoneSchema),
    telegram: clearableText(teacherTelegramSchema),
    hourlyRate: teacherHourlyRateSchema.optional().meta({
      description:
        'Hourly rate in the organization currency; applies to lessons created after the change.',
      example: 1500,
    }),
    startedOn: teacherStartedOnSchema.optional(),
  })
  .strict()
  .meta({
    id: 'UpdateTeacherRequest',
    description:
      'Teacher fields to change; an empty string or null clears a contact field.',
  });

export type UpdateTeacherDto = z.infer<typeof updateTeacherSchema>;
