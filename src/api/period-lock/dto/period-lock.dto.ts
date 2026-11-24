import { z } from 'zod';

export const periodMonthSchema = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Expected YYYY-MM')
  .meta({ description: 'Month (YYYY-MM).', example: '2026-10' });

export const closePeriodSchema = z
  .object({ month: periodMonthSchema })
  .strict()
  .meta({
    id: 'ClosePeriodRequest',
    description: 'Month to close. Only months that have already ended.',
  });

export type ClosePeriodDto = z.infer<typeof closePeriodSchema>;

export const periodLockResponseSchema = z
  .object({
    month: periodMonthSchema,
    closedAt: z.iso.datetime().meta({
      description: 'When the month was closed.',
      example: '2026-11-03T09:15:00.000Z',
    }),
    closedBy: z
      .object({ id: z.string(), name: z.string() })
      .meta({ description: 'Who closed the month.' }),
  })
  .meta({ id: 'PeriodLockResponse', description: 'A closed month.' });

export type PeriodLockResponseDto = z.infer<typeof periodLockResponseSchema>;

export const periodLockListResponseSchema = z
  .object({
    currentMonth: periodMonthSchema.meta({
      description: 'Current month by the school calendar; cannot be closed.',
    }),
    items: z.array(periodLockResponseSchema),
  })
  .meta({
    id: 'PeriodLockListResponse',
    description: 'Closed months of the school, newest first.',
  });

export type PeriodLockListResponseDto = z.infer<
  typeof periodLockListResponseSchema
>;
