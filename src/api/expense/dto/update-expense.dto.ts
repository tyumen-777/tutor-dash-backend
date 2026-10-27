import { z } from 'zod';

import { paymentMethodSchema } from '../../payment/dto/create-payment.dto.js';
import {
  expenseAmountSchema,
  expenseCategorySchema,
  expenseDescriptionSchema,
  expenseEditableStatusSchema,
  expenseRecipientSchema,
  expenseSpentOnSchema,
  expenseTeacherIdSchema,
} from './create-expense.dto.js';

export const updateExpenseSchema = z
  .object({
    spentOn: expenseSpentOnSchema.optional(),
    amount: expenseAmountSchema.optional(),
    category: expenseCategorySchema.optional(),
    recipient: expenseRecipientSchema.optional(),
    method: paymentMethodSchema.optional(),
    status: expenseEditableStatusSchema.optional(),
    description: expenseDescriptionSchema.optional(),
    // Пустая строка очищает комментарий
    comment: z.string().trim().max(500).optional().meta({
      description: 'Free-form comment; an empty string clears it.',
      example: 'Счёт № 124',
    }),
    // null отвязывает преподавателя
    teacherId: expenseTeacherIdSchema.nullable().optional(),
  })
  .strict()
  .meta({
    id: 'UpdateExpenseRequest',
    description: 'Fields of an expense to change.',
  });

export type UpdateExpenseDto = z.infer<typeof updateExpenseSchema>;
