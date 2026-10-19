import { z } from 'zod';

const optionalText = <T extends z.ZodType>(schema: T) =>
  z.preprocess(
    (value) =>
      typeof value === 'string' && value.trim() === '' ? undefined : value,
    schema.optional(),
  );

export const createTeacherSchema = z
  .object({
    fullName: z.string().trim().min(1).max(200).meta({
      description: 'Full name of the teacher.',
      example: 'Иванова Мария Петровна',
    }),
    email: optionalText(
      z
        .string()
        .trim()
        .toLowerCase()
        .pipe(
          z.email().meta({
            description: 'Teacher email address.',
            example: 'teacher@example.com',
          }),
        ),
    ),
    phone: optionalText(
      z
        .string()
        .trim()
        .regex(/^\+?[\d\s()-]{5,20}$/)
        .meta({
          description: 'Teacher phone number.',
          example: '+7 912 345-67-89',
        }),
    ),
    telegram: optionalText(
      z
        .string()
        .trim()
        .transform((value) =>
          value.replace(/^(?:https?:\/\/)?(?:t\.me\/|@)/i, ''),
        )
        .pipe(z.string().regex(/^[a-zA-Z0-9_]{5,32}$/))
        .meta({
          description:
            'Telegram username. Accepts "username", "@username" or "t.me/username"; stored without "@".',
          example: '@maria_teacher',
        }),
    ),
    hourlyRate: z.coerce
      .number()
      .nonnegative()
      .max(9_999_999_999.99)
      .multipleOf(0.01)
      .meta({
        description: 'Hourly rate in the organization currency.',
        example: 1500,
      }),
    startedOn: z.iso.date().meta({
      description: 'Employment start date (YYYY-MM-DD).',
      example: '2026-10-01',
    }),
  })
  .strict()
  .meta({
    id: 'CreateTeacherRequest',
    description: 'Payload for adding a teacher to the active organization.',
  });

export type CreateTeacherDto = z.infer<typeof createTeacherSchema>;
