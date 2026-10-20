import { z } from 'zod';

export const teacherResponseSchema = z
  .object({
    id: z.uuid().meta({
      description: 'Teacher ID.',
      examples: ['01929b3e-7c4a-7d2e-9f6b-1c2d3e4f5a6b'],
    }),
    fullName: z.string().meta({
      description: 'Full name of the teacher.',
      examples: ['Иванова Мария Петровна'],
    }),
    email: z
      .email()
      .nullable()
      .meta({
        description: 'Teacher email address.',
        examples: ['teacher@example.com'],
      }),
    phone: z
      .string()
      .nullable()
      .meta({
        description: 'Teacher phone number.',
        examples: ['+7 912 345-67-89'],
      }),
    telegram: z
      .string()
      .nullable()
      .meta({
        description: 'Telegram username without "@".',
        examples: ['maria_teacher'],
      }),
    hourlyRate: z.string().meta({
      description: 'Hourly rate as a decimal string with 2 fraction digits.',
      examples: ['1500.00'],
    }),
    startedOn: z.iso.date().meta({
      description: 'Employment start date (YYYY-MM-DD).',
      examples: ['2026-10-01'],
    }),
    endedOn: z.iso
      .date()
      .nullable()
      .meta({
        description:
          'Employment end date (YYYY-MM-DD); set for archived teachers.',
        examples: [null],
      }),
    isActive: z.boolean().meta({
      description: 'Whether the teacher is active (false = archived).',
      examples: [true],
    }),
    createdAt: z.iso.datetime().meta({
      description: 'Creation date in ISO 8601 format.',
      examples: ['2026-10-19T12:00:00.000Z'],
    }),
  })
  .meta({
    id: 'TeacherResponse',
    description: 'Organization teacher.',
  });

export type TeacherResponseDto = z.infer<typeof teacherResponseSchema>;

export const teacherListResponseSchema = z
  .object({
    items: z.array(teacherResponseSchema),
    total: z
      .number()
      .int()
      .meta({
        description: 'Total number of teachers matching the filters.',
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
        description: 'Number of skipped teachers.',
        examples: [0],
      }),
  })
  .meta({
    id: 'TeacherListResponse',
    description: 'Page of organization teachers.',
  });

export type TeacherListResponseDto = z.infer<typeof teacherListResponseSchema>;
