import { z } from 'zod';

const optionalText = <T extends z.ZodType>(schema: T) =>
  z.preprocess(
    (value) =>
      typeof value === 'string' && value.trim() === '' ? undefined : value,
    schema.optional(),
  );

const isTimezone = (value: string): boolean => {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value });
    return true;
  } catch {
    return false;
  }
};

export const createStudentSchema = z
  .object({
    firstName: z.string().trim().min(1).max(100).meta({
      description: 'First name of the student.',
      example: 'Анна',
    }),
    lastName: optionalText(
      z.string().trim().max(100).meta({
        description: 'Last name of the student.',
        example: 'Смирнова',
      }),
    ),
    email: optionalText(
      z
        .string()
        .trim()
        .toLowerCase()
        .pipe(
          z.email().meta({
            description: 'Student email address.',
            example: 'student@example.com',
          }),
        ),
    ),
    phone: optionalText(
      z
        .string()
        .trim()
        .regex(/^\+?[\d\s()-]{5,20}$/)
        .meta({
          description: 'Student phone number.',
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
          example: '@anna_smirnova',
        }),
    ),
    teacherId: optionalText(
      z.uuid().meta({
        description:
          'ID of the main teacher (an active teacher of the organization).',
        example: '01929b3e-7c4a-7d2e-9f6b-1c2d3e4f5a6b',
      }),
    ),
    level: optionalText(
      z.string().trim().max(50).meta({
        description: 'Student level in free form, e.g. "A2", "7 класс", "ОГЭ".',
        example: 'B1',
      }),
    ),
    birthDate: optionalText(
      z.iso
        .date()
        .refine((date) => date >= '1900-01-01', 'birthDate is too early')
        .refine(
          (date) => date <= new Date().toISOString().slice(0, 10),
          'birthDate cannot be in the future',
        )
        .meta({
          description: 'Birth date (YYYY-MM-DD).',
          example: '2012-05-14',
        }),
    ),
    timezone: optionalText(
      z.string().trim().refine(isTimezone, 'Unknown IANA timezone').meta({
        description:
          'IANA timezone of the student. Defaults to the organization timezone.',
        example: 'Asia/Yekaterinburg',
      }),
    ),
    // Приостановка и архив — отдельные действия над существующим учеником
    status: z.enum(['LEAD', 'ACTIVE']).default('ACTIVE').meta({
      description: 'Initial status: LEAD (trial / prospect) or ACTIVE.',
      example: 'ACTIVE',
    }),
    note: optionalText(
      z.string().trim().max(2000).meta({
        description: 'Free-form note.',
        example: 'Готовится к ОГЭ по математике',
      }),
    ),
  })
  .strict()
  .meta({
    id: 'CreateStudentRequest',
    description: 'Payload for adding a student to the active organization.',
  });

export type CreateStudentDto = z.infer<typeof createStudentSchema>;
