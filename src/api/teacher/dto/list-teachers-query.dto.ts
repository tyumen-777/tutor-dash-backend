import { z } from 'zod';

export const listTeachersQuerySchema = z
  .object({
    search: z.string().trim().max(200).optional().meta({
      description:
        'Case-insensitive search by full name, email, phone or Telegram.',
      example: 'иванова',
    }),
    status: z.enum(['active', 'inactive', 'all']).default('active').meta({
      description: 'Filter by teacher status.',
      example: 'active',
    }),
    limit: z.coerce.number().int().min(1).max(100).default(20).meta({
      description: 'Page size.',
      example: 20,
    }),
    offset: z.coerce.number().int().min(0).default(0).meta({
      description: 'Number of teachers to skip.',
      example: 0,
    }),
  })
  .strict()
  .meta({
    id: 'ListTeachersQuery',
    description: 'Filters and pagination for the teacher list.',
  });

export type ListTeachersQueryDto = z.infer<typeof listTeachersQuerySchema>;
