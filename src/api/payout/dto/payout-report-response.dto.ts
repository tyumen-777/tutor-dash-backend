import { z } from 'zod';

const money = (description: string, example: string) =>
  z.string().meta({ description, examples: [example] });

const count = (description: string, example: number) =>
  z
    .number()
    .int()
    .meta({ description, examples: [example] });

const payoutTeacherSchema = z.object({
  id: z.uuid().meta({ description: 'Teacher ID.' }),
  fullName: z.string().meta({ description: 'Full name of the teacher.' }),
  isActive: z.boolean().meta({ description: 'False for archived teachers.' }),
  lessonsCount: count('Held lessons in the period.', 24),
  unpaidLessonsCount: count('Held lessons in the period not paid yet.', 8),
  accrued: money('Teacher pay for held lessons in the period.', '48000.00'),
  paid: money('Pay for lessons of the period already paid out.', '32000.00'),
  due: money('Pay for lessons of the period not paid yet.', '16000.00'),
  dueBefore: money(
    'Pay for held lessons before the period not paid yet.',
    '4000.00',
  ),
});

export const payoutReportResponseSchema = z
  .object({
    currency: z.string().meta({
      description: 'ISO 4217 currency code of the organization.',
      examples: ['RUB'],
    }),
    period: z.object({
      from: z.iso.date().meta({ examples: ['2026-10-01'] }),
      to: z.iso.date().meta({ examples: ['2026-10-31'] }),
    }),
    totals: z.object({
      accrued: money('Teacher pay for the period.', '186000.00'),
      paid: money('Already paid for the period.', '120000.00'),
      due: money('Not paid yet for the period.', '66000.00'),
      dueBefore: money('Not paid yet before the period.', '4000.00'),
    }),
    teachers: z.array(payoutTeacherSchema).meta({
      description:
        'Teachers with held lessons in the period or unpaid lessons before it, the largest debt first.',
    }),
  })
  .meta({
    id: 'PayoutReportResponse',
    description: 'Teacher pay accrued, paid and due for the period.',
  });

export type PayoutReportResponseDto = z.infer<
  typeof payoutReportResponseSchema
>;
