import { z } from 'zod';

export const lessonStatusSchema = z.enum([
  'SCHEDULED',
  'COMPLETED',
  'CANCELED',
  'RESCHEDULED',
  'DELETED',
]);

export const listLessonsQuerySchema = z
  .object({
    from: z.iso.date().optional().meta({
      description: 'Lessons on or after this date (YYYY-MM-DD).',
      example: '2026-10-01',
    }),
    to: z.iso.date().optional().meta({
      description: 'Lessons on or before this date (YYYY-MM-DD).',
      example: '2026-10-31',
    }),
    teacherId: z.uuid().optional().meta({
      description: 'Only lessons of this teacher.',
      example: '01929b3e-7c4a-7d2e-9f6b-1c2d3e4f5a6c',
    }),
    studentId: z.uuid().optional().meta({
      description: 'Only lessons of this student.',
      example: '01929b3e-7c4a-7d2e-9f6b-1c2d3e4f5a6b',
    }),
    status: lessonStatusSchema.optional().meta({
      description:
        'Filter by lesson status. Without it deleted lessons are left out; DELETED lists only them.',
      example: 'COMPLETED',
    }),
    paidOut: z
      .enum(['true', 'false'])
      .transform((value) => value === 'true')
      .optional()
      .meta({
        description:
          'true — only lessons included in a teacher payout, false — only lessons not paid out yet.',
        example: 'false',
      }),
    limit: z.coerce.number().int().min(1).max(100).default(20).meta({
      description: 'Page size.',
      example: 20,
    }),
    offset: z.coerce.number().int().min(0).default(0).meta({
      description: 'Number of lessons to skip.',
      example: 0,
    }),
  })
  .strict()
  .refine((query) => !query.from || !query.to || query.from <= query.to, {
    message: 'from cannot be later than to',
    path: ['from'],
  })
  .meta({
    id: 'ListLessonsQuery',
    description: 'Filters and pagination for the lesson list.',
  });

export type ListLessonsQueryDto = z.infer<typeof listLessonsQuerySchema>;
