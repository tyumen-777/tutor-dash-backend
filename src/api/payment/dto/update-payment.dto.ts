import { z } from 'zod';

import {
  paymentAmountSchema,
  paymentLessonsCountSchema,
  paymentMethodSchema,
  paymentPaidOnSchema,
} from './create-payment.dto.js';

export const updatePaymentSchema = z
  .object({
    amount: paymentAmountSchema.optional(),
    lessonsCount: paymentLessonsCountSchema.optional(),
    paidOn: paymentPaidOnSchema.optional(),
    method: paymentMethodSchema.optional(),
    // Пустая строка очищает комментарий
    comment: z.string().trim().max(2000).optional().meta({
      description: 'Free-form comment; an empty string clears it.',
      example: 'Оплата за ноябрь',
    }),
  })
  .strict()
  .meta({
    id: 'UpdatePaymentRequest',
    description: 'Fields of a completed payment to change.',
  });

export type UpdatePaymentDto = z.infer<typeof updatePaymentSchema>;
