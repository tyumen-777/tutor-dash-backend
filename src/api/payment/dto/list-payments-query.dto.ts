import { z } from 'zod';

export const listPaymentsQuerySchema = z
  .object({
    from: z.iso.date().optional().meta({
      description: 'Payments made on or after this date (YYYY-MM-DD).',
      example: '2026-10-01',
    }),
    to: z.iso.date().optional().meta({
      description: 'Payments made on or before this date (YYYY-MM-DD).',
      example: '2026-10-31',
    }),
    studentId: z.uuid().optional().meta({
      description: 'Only payments of this student.',
      example: '01929b3e-7c4a-7d2e-9f6b-1c2d3e4f5a6b',
    }),
    method: z.enum(['CASH', 'CARD', 'TRANSFER', 'OTHER']).optional().meta({
      description: 'Filter by payment method.',
      example: 'CARD',
    }),
    status: z.enum(['COMPLETED', 'CANCELED', 'REFUNDED']).optional().meta({
      description: 'Filter by payment status.',
      example: 'COMPLETED',
    }),
    limit: z.coerce.number().int().min(1).max(100).default(20).meta({
      description: 'Page size.',
      example: 20,
    }),
    offset: z.coerce.number().int().min(0).default(0).meta({
      description: 'Number of payments to skip.',
      example: 0,
    }),
  })
  .strict()
  .refine((query) => !query.from || !query.to || query.from <= query.to, {
    message: 'from cannot be later than to',
    path: ['from'],
  })
  .meta({
    id: 'ListPaymentsQuery',
    description: 'Filters and pagination for the payment list.',
  });

export type ListPaymentsQueryDto = z.infer<typeof listPaymentsQuerySchema>;
