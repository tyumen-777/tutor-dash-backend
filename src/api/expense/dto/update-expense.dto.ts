import { z } from 'zod';

import { paymentMethodSchema } from '../../payment/dto/create-payment.dto.js';
import {
  expenseAmountSchema,
  expenseCategorySchema,
  expenseDescriptionSchema,
  expenseEditableStatusSchema,
  expenseRecipientSchema,
  expenseSpentOnSchema,
} from './create-expense.dto.js';

export const updateExpenseSchema = z
  .object({
    spentOn: expenseSpentOnSchema.optional(),
    amount: expenseAmountSchema.optional(),
    category: expenseCategorySchema.optional(),
    // Пустая строка очищает получателя
    recipient: z
      .union([expenseRecipientSchema, z.literal('')])
      .optional()
      .meta({
        description: 'Who received the money; an empty string clears it.',
        example: 'ООО «БизнесЦентр Плюс»',
      }),
    method: paymentMethodSchema.optional(),
    status: expenseEditableStatusSchema.optional(),
    description: expenseDescriptionSchema.optional(),
    // Пустая строка очищает комментарий
    comment: z.string().trim().max(500).optional().meta({
      description: 'Free-form comment; an empty string clears it.',
      example: 'Счёт № 124',
    }),
    // Привязать преподавателя можно только выплатой через POST /payouts;
    // здесь допускается лишь отвязка у старых ручных расходов
    teacherId: z.null().optional().meta({
      description:
        'Only null is accepted: unlinks the teacher from a manual expense. Teacher salaries are created via POST /payouts.',
    }),
  })
  .strict()
  .meta({
    id: 'UpdateExpenseRequest',
    description: 'Fields of an expense to change.',
  });

export type UpdateExpenseDto = z.infer<typeof updateExpenseSchema>;
