import { z } from 'zod';

const money = (description: string, example: string) =>
  z.string().meta({ description, examples: [example] });

export const myEarningsQuerySchema = z
  .object({
    from: z.iso.date().meta({
      description: 'Lessons on or after this date (YYYY-MM-DD).',
      example: '2026-11-01',
    }),
    to: z.iso.date().meta({
      description: 'Lessons on or before this date (YYYY-MM-DD).',
      example: '2026-11-30',
    }),
  })
  .strict()
  .refine((query) => query.from <= query.to, {
    message: 'from cannot be later than to',
    path: ['from'],
  })
  .meta({
    id: 'MyEarningsQuery',
    description: 'Period of the earnings of the current teacher.',
  });

export type MyEarningsQueryDto = z.infer<typeof myEarningsQuerySchema>;

export const myEarningsResponseSchema = z
  .object({
    currency: z.string().meta({
      description: 'ISO 4217 currency code of the organization.',
      examples: ['RUB'],
    }),
    period: z.object({
      from: z.iso.date(),
      to: z.iso.date(),
    }),
    lessonsCount: z
      .number()
      .int()
      .meta({
        description: 'Held lessons in the period.',
        examples: [24],
      }),
    unpaidLessonsCount: z
      .number()
      .int()
      .meta({
        description: 'Held lessons in the period not paid yet.',
        examples: [8],
      }),
    accrued: money('Pay for held lessons in the period.', '48000.00'),
    paid: money('Pay for lessons of the period already paid out.', '32000.00'),
    due: money('Pay for lessons of the period not paid yet.', '16000.00'),
    dueBefore: money(
      'Pay for held lessons before the period not paid yet.',
      '4000.00',
    ),
    payouts: z
      .array(
        z.object({
          id: z.uuid(),
          paidOn: z.iso.date().meta({ description: 'Payout date.' }),
          amount: money('Paid amount.', '32000.00'),
          lessonsCount: z.number().int().meta({
            description: 'Lessons covered by the payout.',
          }),
        }),
      )
      .meta({ description: 'Payouts made to the teacher in the period.' }),
  })
  .meta({
    id: 'MyEarningsResponse',
    description:
      'Earnings of the current teacher. Only own lessons and payouts are included.',
  });

export type MyEarningsResponseDto = z.infer<typeof myEarningsResponseSchema>;
