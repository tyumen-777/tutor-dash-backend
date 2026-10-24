import { z } from 'zod';

const optionalText = <T extends z.ZodType>(schema: T) =>
  z.preprocess(
    (value) =>
      typeof value === 'string' && value.trim() === '' ? undefined : value,
    schema.optional(),
  );

export const paymentMethodSchema = z
  .enum(['CASH', 'CARD', 'TRANSFER', 'OTHER'])
  .meta({
    description: 'Payment method: cash, card, bank transfer or other.',
    example: 'TRANSFER',
  });

export const paymentAmountSchema = z.coerce
  .number()
  .nonnegative()
  .max(9_999_999_999.99)
  .multipleOf(0.01)
  .meta({
    description:
      'Amount in the organization currency. Zero is allowed for free / bonus packages.',
    example: 12000,
  });

export const paymentLessonsCountSchema = z.coerce
  .number()
  .int()
  .min(1)
  .max(1000)
  .meta({
    description: 'Number of lessons credited to the student for this payment.',
    example: 8,
  });

export const paymentPaidOnSchema = z.iso.date().meta({
  description: 'Payment date (YYYY-MM-DD).',
  example: '2026-10-24',
});

export const paymentCommentSchema = optionalText(
  z.string().trim().max(2000).meta({
    description: 'Free-form comment.',
    example: 'Оплата за ноябрь',
  }),
);

export const createPaymentSchema = z
  .object({
    studentId: z.uuid().meta({
      description: 'ID of the student who paid.',
      example: '01929b3e-7c4a-7d2e-9f6b-1c2d3e4f5a6b',
    }),
    amount: paymentAmountSchema,
    lessonsCount: paymentLessonsCountSchema,
    paidOn: paymentPaidOnSchema,
    method: paymentMethodSchema,
    comment: paymentCommentSchema,
  })
  .strict()
  .meta({
    id: 'CreatePaymentRequest',
    description:
      'Payload for registering a student payment. Creates a lesson package with the given number of lessons.',
  });

export type CreatePaymentDto = z.infer<typeof createPaymentSchema>;
