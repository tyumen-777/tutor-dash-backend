import { z } from 'zod';

export const studentResponseSchema = z
  .object({
    id: z.uuid().meta({
      description: 'Student ID.',
      examples: ['01929b3e-7c4a-7d2e-9f6b-1c2d3e4f5a6b'],
    }),
    firstName: z.string().meta({
      description: 'First name of the student.',
      examples: ['Анна'],
    }),
    lastName: z
      .string()
      .nullable()
      .meta({
        description: 'Last name of the student.',
        examples: ['Смирнова'],
      }),
    email: z
      .email()
      .nullable()
      .meta({
        description: 'Student email address.',
        examples: ['student@example.com'],
      }),
    phone: z
      .string()
      .nullable()
      .meta({
        description: 'Student phone number.',
        examples: ['+7 912 345-67-89'],
      }),
    telegram: z
      .string()
      .nullable()
      .meta({
        description: 'Telegram username without "@".',
        examples: ['anna_smirnova'],
      }),
    teacher: z
      .object({
        id: z.uuid().meta({
          description: 'Teacher ID.',
          examples: ['01929b3e-7c4a-7d2e-9f6b-1c2d3e4f5a6b'],
        }),
        fullName: z.string().meta({
          description: 'Full name of the teacher.',
          examples: ['Иванова Мария Петровна'],
        }),
        isActive: z.boolean().meta({
          description: 'Whether the teacher is active (false = archived).',
          examples: [true],
        }),
      })
      .nullable()
      .meta({
        description: 'Main teacher of the student.',
      }),
    level: z
      .object({
        id: z.uuid().meta({
          description: 'Study level ID.',
          examples: ['01929b3e-7c4a-7d2e-9f6b-1c2d3e4f5a6b'],
        }),
        code: z.string().meta({
          description: 'Short level code.',
          examples: ['B1'],
        }),
        name: z.string().meta({
          description: 'Level name.',
          examples: ['Intermediate'],
        }),
      })
      .nullable()
      .meta({
        description: 'Study level of the student.',
      }),
    birthDate: z.iso
      .date()
      .nullable()
      .meta({
        description: 'Birth date (YYYY-MM-DD).',
        examples: ['2012-05-14'],
      }),
    timezone: z
      .string()
      .nullable()
      .meta({
        description:
          'IANA timezone of the student; null means the organization timezone.',
        examples: ['Asia/Yekaterinburg'],
      }),
    status: z.enum(['LEAD', 'ACTIVE', 'PAUSED', 'ARCHIVED']).meta({
      description: 'Student status.',
      examples: ['ACTIVE'],
    }),
    note: z
      .string()
      .nullable()
      .meta({
        description: 'Free-form note.',
        examples: ['Готовится к ОГЭ по математике'],
      }),
    lessonsLeft: z
      .number()
      .int()
      .meta({
        description:
          'Lessons left on the student balance across all non-canceled packages.',
        examples: [6],
      }),
    createdAt: z.iso.datetime().meta({
      description: 'Creation date in ISO 8601 format.',
      examples: ['2026-10-22T12:00:00.000Z'],
    }),
  })
  .meta({
    id: 'StudentResponse',
    description: 'Organization student.',
  });

export type StudentResponseDto = z.infer<typeof studentResponseSchema>;

export const studentListResponseSchema = z
  .object({
    items: z.array(studentResponseSchema),
    total: z
      .number()
      .int()
      .meta({
        description: 'Total number of students matching the filters.',
        examples: [42],
      }),
    limit: z
      .number()
      .int()
      .meta({
        description: 'Page size.',
        examples: [20],
      }),
    offset: z
      .number()
      .int()
      .meta({
        description: 'Number of skipped students.',
        examples: [0],
      }),
  })
  .meta({
    id: 'StudentListResponse',
    description: 'Page of organization students.',
  });

export type StudentListResponseDto = z.infer<typeof studentListResponseSchema>;

export const studentBalanceResponseSchema = z
  .object({
    lessonsTotal: z
      .number()
      .int()
      .meta({
        description: 'Lessons credited by all non-canceled packages.',
        examples: [16],
      }),
    lessonsUsed: z
      .number()
      .int()
      .meta({
        description: 'Lessons already used from these packages.',
        examples: [10],
      }),
    lessonsLeft: z
      .number()
      .int()
      .meta({
        description: 'Lessons left on the balance.',
        examples: [6],
      }),
    lastPaidOn: z.iso
      .date()
      .nullable()
      .meta({
        description: 'Date of the last completed payment (YYYY-MM-DD).',
        examples: ['2026-10-24'],
      }),
  })
  .meta({
    id: 'StudentBalanceResponse',
    description: 'Lesson balance of a student.',
  });

export type StudentBalanceResponseDto = z.infer<
  typeof studentBalanceResponseSchema
>;
