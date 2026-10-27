import { z } from 'zod';

import { EXPENSE_CATEGORIES, EXPENSE_STATUSES } from './create-expense.dto.js';

export const listExpensesQuerySchema = z
  .object({
    from: z.iso.date().optional().meta({
      description: 'Expenses made on or after this date (YYYY-MM-DD).',
      example: '2026-10-01',
    }),
    to: z.iso.date().optional().meta({
      description: 'Expenses made on or before this date (YYYY-MM-DD).',
      example: '2026-10-31',
    }),
    // Несколько категорий передаются через запятую: category=RENT,SALARY
    category: z
      .string()
      .optional()
      .transform((value) =>
        value ? value.split(',').filter(Boolean) : undefined,
      )
      .pipe(z.array(z.enum(EXPENSE_CATEGORIES)).optional())
      .meta({
        description: 'Comma-separated list of categories.',
        example: 'RENT,SALARY',
      }),
    status: z.enum(EXPENSE_STATUSES).optional().meta({
      description: 'Filter by expense status.',
      example: 'PAID',
    }),
    teacherId: z.uuid().optional().meta({
      description: 'Only salary expenses of this teacher.',
      example: '01929b3e-7c4a-7d2e-9f6b-1c2d3e4f5a6b',
    }),
    limit: z.coerce.number().int().min(1).max(100).default(20).meta({
      description: 'Page size.',
      example: 20,
    }),
    offset: z.coerce.number().int().min(0).default(0).meta({
      description: 'Number of expenses to skip.',
      example: 0,
    }),
  })
  .strict()
  .refine((query) => !query.from || !query.to || query.from <= query.to, {
    message: 'from cannot be later than to',
    path: ['from'],
  })
  .meta({
    id: 'ListExpensesQuery',
    description: 'Filters and pagination for the expense list.',
  });

export type ListExpensesQueryDto = z.infer<typeof listExpensesQuerySchema>;
