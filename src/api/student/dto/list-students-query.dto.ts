import { z } from 'zod';

export const listStudentsQuerySchema = z
  .object({
    search: z.string().trim().max(200).optional().meta({
      description: 'Case-insensitive search by name, email, phone or Telegram.',
      example: 'смирнова',
    }),
    status: z
      .enum(['LEAD', 'ACTIVE', 'PAUSED', 'ARCHIVED', 'ALL'])
      .optional()
      .meta({
        description:
          'Filter by student status. ALL returns every student; when omitted, archived students are excluded.',
        example: 'ACTIVE',
      }),
    teacherId: z.uuid().optional().meta({
      description: 'Only students of this main teacher.',
      example: '01929b3e-7c4a-7d2e-9f6b-1c2d3e4f5a6b',
    }),
    limit: z.coerce.number().int().min(1).max(100).default(20).meta({
      description: 'Page size.',
      example: 20,
    }),
    offset: z.coerce.number().int().min(0).default(0).meta({
      description: 'Number of students to skip.',
      example: 0,
    }),
  })
  .strict()
  .meta({
    id: 'ListStudentsQuery',
    description: 'Filters and pagination for the student list.',
  });

export type ListStudentsQueryDto = z.infer<typeof listStudentsQuerySchema>;
