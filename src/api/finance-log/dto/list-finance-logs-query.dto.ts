import { z } from 'zod';

export const financeLogActionSchema = z
  .enum(['CREATED', 'UPDATED', 'CANCELED'])
  .meta({
    description: 'Operation: created, edited or canceled.',
    example: 'UPDATED',
  });

export const financeLogEntitySchema = z
  .enum(['PAYMENT', 'PAYOUT', 'PERIOD'])
  .meta({
    description:
      'What the operation was made on: a student payment, a teacher payout or closing / reopening a month.',
    example: 'PAYOUT',
  });

export const listFinanceLogsQuerySchema = z
  .object({
    from: z.iso.date().optional().meta({
      description:
        'Operations made on or after this date in the school timezone (YYYY-MM-DD).',
      example: '2026-11-01',
    }),
    to: z.iso.date().optional().meta({
      description:
        'Operations made on or before this date in the school timezone (YYYY-MM-DD).',
      example: '2026-11-30',
    }),
    action: financeLogActionSchema.optional(),
    entityType: financeLogEntitySchema.optional(),
    studentId: z.uuid().optional().meta({
      description: 'Only operations related to this student.',
      example: '01929b3e-7c4a-7d2e-9f6b-1c2d3e4f5a6b',
    }),
    limit: z.coerce.number().int().min(1).max(100).default(50).meta({
      description: 'Page size.',
      example: 50,
    }),
    offset: z.coerce.number().int().min(0).default(0).meta({
      description: 'Number of operations to skip.',
      example: 0,
    }),
  })
  .strict()
  .refine((query) => !query.from || !query.to || query.from <= query.to, {
    message: 'from cannot be later than to',
    path: ['from'],
  })
  .meta({
    id: 'ListFinanceLogsQuery',
    description: 'Filters and pagination for the finance operations history.',
  });

export type ListFinanceLogsQueryDto = z.infer<
  typeof listFinanceLogsQuerySchema
>;
