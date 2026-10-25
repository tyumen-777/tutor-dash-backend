import { z } from 'zod';

import {
  clearableText,
  studentBirthDateSchema,
  studentEditableStatusSchema,
  studentEmailSchema,
  studentFirstNameSchema,
  studentLastNameSchema,
  studentLevelSchema,
  studentNoteSchema,
  studentPhoneSchema,
  studentTeacherIdSchema,
  studentTelegramSchema,
  studentTimezoneSchema,
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
    level: clearableText(studentLevelSchema),
    birthDate: clearableText(studentBirthDateSchema),
    timezone: clearableText(studentTimezoneSchema),
    status: studentEditableStatusSchema.optional().meta({
      description:
        'LEAD or ACTIVE; only a lead or an active student can be switched.',
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
