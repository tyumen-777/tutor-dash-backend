import { z } from 'zod';

import {
  clearableText,
  studentBirthDateSchema,
  studentEmailSchema,
  studentFirstNameSchema,
  studentLastNameSchema,
  studentLevelIdSchema,
  studentNoteSchema,
  studentPhoneSchema,
  studentTeacherIdSchema,
  studentTelegramSchema,
  studentTimezoneSchema,
  studentUpdatableStatusSchema,
} from './create-student.dto.js';

export const updateStudentSchema = z
  .object({
    firstName: studentFirstNameSchema.optional(),
    // Пустая строка или null очищает поле
    lastName: clearableText(studentLastNameSchema),
    email: clearableText(studentEmailSchema),
    phone: clearableText(studentPhoneSchema),
    telegram: clearableText(studentTelegramSchema),
    teacherId: clearableText(studentTeacherIdSchema),
    levelId: clearableText(studentLevelIdSchema),
    birthDate: clearableText(studentBirthDateSchema),
    timezone: clearableText(studentTimezoneSchema),
    status: studentUpdatableStatusSchema.optional().meta({
      description:
        'LEAD, ACTIVE or PAUSED. An archived student is returned via POST /students/:id/restore.',
      example: 'ACTIVE',
    }),
    note: clearableText(studentNoteSchema),
  })
  .strict()
  .meta({
    id: 'UpdateStudentRequest',
    description:
      'Student fields to change; an empty string or null clears an optional field.',
  });

export type UpdateStudentDto = z.infer<typeof updateStudentSchema>;
