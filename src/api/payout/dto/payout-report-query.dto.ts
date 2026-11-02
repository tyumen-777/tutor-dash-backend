import { z } from 'zod';

export const payoutReportQuerySchema = z
  .object({
    from: z.iso.date().meta({
      description: 'Lessons on or after this date (YYYY-MM-DD).',
      example: '2026-10-01',
    }),
    to: z.iso.date().meta({
      description: 'Lessons on or before this date (YYYY-MM-DD).',
      example: '2026-10-31',
    }),
    teacherId: z.uuid().optional().meta({
      description: 'Only this teacher.',
      example: '01929b3e-7c4a-7d2e-9f6b-1c2d3e4f5a6b',
    }),
  })
  .strict()
  .refine((query) => query.from <= query.to, {
    message: 'from cannot be later than to',
    path: ['from'],
  })
  .meta({
    id: 'PayoutReportQuery',
    description: 'Period of the teacher payout report.',
  });

export type PayoutReportQueryDto = z.infer<typeof payoutReportQuerySchema>;
