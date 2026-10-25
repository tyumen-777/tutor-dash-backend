import { z } from 'zod';

const isBlank = (value: unknown): boolean =>
  typeof value === 'string' && value.trim() === '';

const optionalText = <T extends z.ZodType>(schema: T) =>
  z.preprocess(
    (value) => (isBlank(value) ? undefined : value),
    schema.optional(),
  );

/**
 * For updates: an empty string or null clears the field, absence keeps it.
 */
export const clearableText = <T extends z.ZodType>(schema: T) =>
  z.preprocess(
    (value) => (isBlank(value) ? null : value),
    schema.nullable().optional(),
  );

const isTimezone = (value: string): boolean => {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value });
    return true;
  } catch {
    return false;
  }
};

export const studentFirstNameSchema = z
  .string()
  .trim()
  .min(1)
  .max(100)
  .meta({
    description: 'First name of the student.',
    example: 'Анна',
  });

export const studentLastNameSchema = z.string().trim().max(100).meta({
  description: 'Last name of the student.',
  example: 'Смирнова',
});

export const studentEmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(
    z.email().meta({
      description: 'Student email address.',
      example: 'student@example.com',
    }),
  );

export const studentPhoneSchema = z
  .string()
  .trim()
  .regex(/^\+?[\d\s()-]{5,20}$/)
  .meta({
    description: 'Student phone number.',
    example: '+7 912 345-67-89',
  });

export const studentTelegramSchema = z
  .string()
  .trim()
  .transform((value) => value.replace(/^(?:https?:\/\/)?(?:t\.me\/|@)/i, ''))
  .pipe(z.string().regex(/^[a-zA-Z0-9_]{5,32}$/))
  .meta({
    description:
      'Telegram username. Accepts "username", "@username" or "t.me/username"; stored without "@".',
    example: '@anna_smirnova',
  });

export const studentTeacherIdSchema = z.uuid().meta({
  description: 'ID of the main teacher (an active teacher of the organization).',
  example: '01929b3e-7c4a-7d2e-9f6b-1c2d3e4f5a6b',
});

export const studentLevelSchema = z.string().trim().max(50).meta({
  description: 'Student level in free form, e.g. "A2", "7 класс", "ОГЭ".',
  example: 'B1',
});

export const studentBirthDateSchema = z.iso
  .date()
  .refine((date) => date >= '1900-01-01', 'birthDate is too early')
  .refine(
    (date) => date <= new Date().toISOString().slice(0, 10),
    'birthDate cannot be in the future',
  )
  .meta({
    description: 'Birth date (YYYY-MM-DD).',
    example: '2012-05-14',
  });

export const studentTimezoneSchema = z
  .string()
  .trim()
  .refine(isTimezone, 'Unknown IANA timezone')
  .meta({
    description:
      'IANA timezone of the student. Defaults to the organization timezone.',
    example: 'Asia/Yekaterinburg',
  });

// Приостановка и архив — отдельные действия над существующим учеником
export const studentEditableStatusSchema = z.enum(['LEAD', 'ACTIVE']);

export const studentNoteSchema = z.string().trim().max(2000).meta({
  description: 'Free-form note.',
  example: 'Готовится к ОГЭ по математике',
});

export const createStudentSchema = z
  .object({
    firstName: studentFirstNameSchema,
    lastName: optionalText(studentLastNameSchema),
    email: optionalText(studentEmailSchema),
    phone: optionalText(studentPhoneSchema),
    telegram: optionalText(studentTelegramSchema),
    teacherId: optionalText(studentTeacherIdSchema),
    level: optionalText(studentLevelSchema),
    birthDate: optionalText(studentBirthDateSchema),
    timezone: optionalText(studentTimezoneSchema),
    status: studentEditableStatusSchema.default('ACTIVE').meta({
      description: 'Initial status: LEAD (trial / prospect) or ACTIVE.',
      example: 'ACTIVE',
    }),
    note: optionalText(studentNoteSchema),
  })
  .strict()
  .meta({
    id: 'CreateStudentRequest',
    description: 'Payload for adding a student to the active organization.',
  });

export type CreateStudentDto = z.infer<typeof createStudentSchema>;
