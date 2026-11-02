import { z } from 'zod';

import { paymentMethodSchema } from '../../payment/dto/create-payment.dto.js';

export const createPayoutSchema = z
  .object({
    teacherId: z.uuid().meta({
      description: 'Teacher who receives the payout.',
      example: '01929b3e-7c4a-7d2e-9f6b-1c2d3e4f5a6b',
    }),
    from: z.iso.date().meta({
      description: 'Pay for lessons on or after this date (YYYY-MM-DD).',
      example: '2026-10-01',
    }),
    to: z.iso.date().meta({
      description: 'Pay for lessons on or before this date (YYYY-MM-DD).',
      example: '2026-10-31',
    }),
    paidOn: z.iso.date().meta({
      description: 'Payout date (YYYY-MM-DD).',
      example: '2026-11-02',
    }),
    method: paymentMethodSchema,
    comment: z.preprocess(
      (value) =>
        typeof value === 'string' && value.trim() === '' ? undefined : value,
      z
        .string()
        .trim()
        .max(500)
        .optional()
        .meta({ description: 'Free-form comment.', example: 'Аванс' }),
    ),
  })
  .strict()
  .refine((dto) => dto.from <= dto.to, {
    message: 'from cannot be later than to',
    path: ['from'],
  })
  .meta({
    id: 'CreatePayoutRequest',
    description:
      'Pays the teacher for every held and not yet paid lesson of the period.',
  });

export type CreatePayoutDto = z.infer<typeof createPayoutSchema>;
