import { z } from 'zod';

const isBlank = (value: unknown) =>
  typeof value === 'string' && value.trim() === '';

const optionalText = <T extends z.ZodType>(schema: T) =>
  z.preprocess(
    (value) => (isBlank(value) ? undefined : value),
    schema.optional(),
  );

export const clearableText = <T extends z.ZodType>(schema: T) =>
  z.preprocess(
    (value) => (isBlank(value) ? null : value),
    schema.nullable().optional(),
  );

export const teacherFullNameSchema = z.string().trim().min(1).max(200).meta({
  description: 'Full name of the teacher.',
  example: 'Иванова Мария Петровна',
});

export const teacherEmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(
    z.email().meta({
      description: 'Teacher email address.',
      example: 'teacher@example.com',
    }),
  );

export const teacherPhoneSchema = z
  .string()
  .trim()
  .regex(/^\+?[\d\s()-]{5,20}$/)
  .meta({
    description: 'Teacher phone number.',
    example: '+7 912 345-67-89',
  });

export const teacherTelegramSchema = z
  .string()
  .trim()
  .transform((value) => value.replace(/^(?:https?:\/\/)?(?:t\.me\/|@)/i, ''))
  .pipe(z.string().regex(/^[a-zA-Z0-9_]{5,32}$/))
  .meta({
    description:
      'Telegram username. Accepts "username", "@username" or "t.me/username"; stored without "@".',
    example: '@maria_teacher',
  });

// Без явной проверки входа coerce превращает null и пустую строку в 0
export const teacherHourlyRateSchema = z
  .union([z.number(), z.string().trim().min(1)])
  .pipe(
    z.coerce
      .number<string | number>()
      .nonnegative()
      .max(9_999_999_999.99)
      .multipleOf(0.01)
      .meta({
        description: 'Hourly rate in the organization currency.',
        example: 1500,
      }),
  );

export const teacherStartedOnSchema = z.iso.date().meta({
  description: 'Employment start date (YYYY-MM-DD).',
  example: '2026-10-01',
});

export const createTeacherSchema = z
  .object({
    fullName: teacherFullNameSchema,
    email: optionalText(teacherEmailSchema),
    phone: optionalText(teacherPhoneSchema),
    telegram: optionalText(teacherTelegramSchema),
    hourlyRate: teacherHourlyRateSchema,
    startedOn: teacherStartedOnSchema,
  })
  .strict()
  .meta({
    id: 'CreateTeacherRequest',
    description: 'Payload for adding a teacher to the active organization.',
  });

export type CreateTeacherDto = z.infer<typeof createTeacherSchema>;
