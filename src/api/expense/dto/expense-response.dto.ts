import { z } from 'zod';

import { EXPENSE_CATEGORIES, EXPENSE_STATUSES } from './create-expense.dto.js';

export const expenseResponseSchema = z
  .object({
    id: z.uuid().meta({
      description: 'Expense ID.',
      examples: ['01929b3e-7c4a-7d2e-9f6b-1c2d3e4f5a6b'],
    }),
    spentOn: z.iso.date().meta({
      description: 'Expense date (YYYY-MM-DD).',
      examples: ['2026-10-01'],
    }),
    amount: z.string().meta({
      description: 'Amount as a decimal string with 2 fraction digits.',
      examples: ['85000.00'],
    }),
    currency: z.string().meta({
      description: 'ISO 4217 currency code.',
      examples: ['RUB'],
    }),
    category: z.enum(EXPENSE_CATEGORIES).meta({
      description: 'Expense category.',
      examples: ['RENT'],
    }),
    recipient: z.string().meta({
      description: 'Who received the money.',
      examples: ['ООО «БизнесЦентр Плюс»'],
    }),
    method: z.enum(['CASH', 'CARD', 'TRANSFER', 'OTHER']).meta({
      description: 'Payment method.',
      examples: ['TRANSFER'],
    }),
    status: z.enum(EXPENSE_STATUSES).meta({
      description: 'Expense status.',
      examples: ['PAID'],
    }),
    description: z.string().meta({
      description: 'What the money was spent on.',
      examples: ['Аренда помещения за октябрь'],
    }),
    comment: z
      .string()
      .nullable()
      .meta({
        description: 'Free-form comment.',
        examples: ['Счёт № 124'],
      }),
    teacher: z
      .object({
        id: z.uuid().meta({
          description: 'Teacher ID.',
          examples: ['01929b3e-7c4a-7d2e-9f6b-1c2d3e4f5a6b'],
        }),
        fullName: z.string().meta({
          description: 'Full name of the teacher.',
          examples: ['Мария Иванова'],
        }),
      })
      .nullable()
      .meta({ description: 'Teacher who received the salary.' }),
    createdBy: z
      .object({
        id: z.string().meta({
          description: 'User ID.',
          examples: ['user_123'],
        }),
        name: z.string().meta({
          description: 'User name.',
          examples: ['Иван Петров'],
        }),
      })
      .meta({ description: 'User who registered the expense.' }),
    createdAt: z.iso.datetime().meta({
      description: 'Creation date in ISO 8601 format.',
      examples: ['2026-10-01T12:00:00.000Z'],
    }),
  })
  .meta({
    id: 'ExpenseResponse',
    description: 'School expense.',
  });

export type ExpenseResponseDto = z.infer<typeof expenseResponseSchema>;

export const expenseListResponseSchema = z
  .object({
    items: z.array(expenseResponseSchema),
    total: z
      .number()
      .int()
      .meta({
        description: 'Total number of expenses matching the filters.',
        examples: [42],
      }),
    limit: z
      .number()
      .int()
      .meta({
        description: 'Page size.',
        examples: [20],
      }),
    offset: z
      .number()
      .int()
      .meta({
        description: 'Number of skipped expenses.',
        examples: [0],
      }),
    summary: z
      .object({
        paidAmount: z.string().meta({
          description: 'Sum of paid expenses matching the filters.',
          examples: ['250000.00'],
        }),
        pendingAmount: z.string().meta({
          description: 'Sum of expenses awaiting payment matching the filters.',
          examples: ['18400.00'],
        }),
        expensesCount: z
          .number()
          .int()
          .meta({
            description:
              'Number of paid and pending expenses matching the filters.',
            examples: [12],
          }),
        byCategory: z
          .array(
            z.object({
              category: z.enum(EXPENSE_CATEGORIES).meta({
                description: 'Expense category.',
                examples: ['RENT'],
              }),
              amount: z.string().meta({
                description: 'Sum of paid and pending expenses.',
                examples: ['85000.00'],
              }),
            }),
          )
          .meta({
            description: 'Totals by category, largest first.',
          }),
      })
      .meta({
        description: 'Totals over all pages (canceled expenses excluded).',
      }),
  })
  .meta({
    id: 'ExpenseListResponse',
    description: 'Page of school expenses with totals.',
  });

export type ExpenseListResponseDto = z.infer<typeof expenseListResponseSchema>;
