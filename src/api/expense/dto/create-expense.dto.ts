import { z } from 'zod';

import { paymentMethodSchema } from '../../payment/dto/create-payment.dto.js';

const optionalText = <T extends z.ZodType>(schema: T) =>
  z.preprocess(
    (value) =>
      typeof value === 'string' && value.trim() === '' ? undefined : value,
    schema.optional(),
  );

export const EXPENSE_CATEGORIES = [
  'RENT',
  'SALARY',
  'MATERIALS',
  'MARKETING',
  'UTILITIES',
  'SOFTWARE',
  'HOUSEHOLD',
  'TAXES',
  'OTHER',
] as const;

export const EXPENSE_STATUSES = ['PAID', 'PENDING', 'CANCELED'] as const;

export const expenseCategorySchema = z.enum(EXPENSE_CATEGORIES).meta({
  description:
    'Expense category: rent, teacher salary, materials, marketing, utilities, software, household, taxes or other.',
  example: 'RENT',
});

// Отменить расход можно только отдельным действием, поэтому CANCELED тут нет
export const expenseEditableStatusSchema = z.enum(['PAID', 'PENDING']).meta({
  description: 'PAID — already paid, PENDING — awaiting payment.',
  example: 'PAID',
});

export const expenseAmountSchema = z.coerce
  .number()
  .positive()
  .max(9_999_999_999.99)
  .multipleOf(0.01)
  .meta({
    description: 'Amount in the organization currency.',
    example: 85000,
  });

export const expenseSpentOnSchema = z.iso.date().meta({
  description: 'Expense date (YYYY-MM-DD).',
  example: '2026-10-01',
});

export const expenseRecipientSchema = z.string().trim().min(2).max(100).meta({
  description: 'Who received the money.',
  example: 'ООО «БизнесЦентр Плюс»',
});

export const expenseDescriptionSchema = z.string().trim().min(3).max(200).meta({
  description: 'What the money was spent on.',
  example: 'Аренда помещения за октябрь',
});

export const expenseTeacherIdSchema = z.uuid().meta({
  description: 'Teacher who received the salary (SALARY category only).',
  example: '01929b3e-7c4a-7d2e-9f6b-1c2d3e4f5a6b',
});

export const createExpenseSchema = z
  .object({
    spentOn: expenseSpentOnSchema,
    amount: expenseAmountSchema,
    category: expenseCategorySchema,
    recipient: expenseRecipientSchema,
    method: paymentMethodSchema,
    status: expenseEditableStatusSchema.default('PAID'),
    description: expenseDescriptionSchema,
    comment: optionalText(
      z.string().trim().max(500).meta({
        description: 'Free-form comment.',
        example: 'Счёт № 124',
      }),
    ),
    teacherId: optionalText(expenseTeacherIdSchema),
  })
  .strict()
  .refine((dto) => !dto.teacherId || dto.category === 'SALARY', {
    message: 'teacherId is allowed only for SALARY expenses',
    path: ['teacherId'],
  })
  .meta({
    id: 'CreateExpenseRequest',
    description: 'Payload for registering a school expense.',
  });

export type CreateExpenseDto = z.infer<typeof createExpenseSchema>;
