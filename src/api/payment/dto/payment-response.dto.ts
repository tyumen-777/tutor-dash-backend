import { z } from 'zod';

export const paymentResponseSchema = z
  .object({
    id: z.uuid().meta({
      description: 'Payment ID.',
      examples: ['01929b3e-7c4a-7d2e-9f6b-1c2d3e4f5a6b'],
    }),
    student: z
      .object({
        id: z.uuid().meta({
          description: 'Student ID.',
          examples: ['01929b3e-7c4a-7d2e-9f6b-1c2d3e4f5a6b'],
        }),
        firstName: z.string().meta({
          description: 'First name of the student.',
          examples: ['Анна'],
        }),
        lastName: z
          .string()
          .nullable()
          .meta({
            description: 'Last name of the student.',
            examples: ['Смирнова'],
          }),
      })
      .meta({ description: 'Student who paid.' }),
    amount: z.string().meta({
      description: 'Amount as a decimal string with 2 fraction digits.',
      examples: ['12000.00'],
    }),
    currency: z.string().meta({
      description: 'ISO 4217 currency code.',
      examples: ['RUB'],
    }),
    lessonsCount: z
      .number()
      .int()
      .nullable()
      .meta({
        description:
          'Number of lessons credited for this payment; null if the payment is not linked to a package.',
        examples: [8],
      }),
    method: z.enum(['CASH', 'CARD', 'TRANSFER', 'OTHER']).meta({
      description: 'Payment method.',
      examples: ['TRANSFER'],
    }),
    status: z.enum(['COMPLETED', 'CANCELED', 'REFUNDED']).meta({
      description: 'Payment status.',
      examples: ['COMPLETED'],
    }),
    paidOn: z.iso.date().meta({
      description: 'Payment date (YYYY-MM-DD).',
      examples: ['2026-10-24'],
    }),
    comment: z
      .string()
      .nullable()
      .meta({
        description: 'Free-form comment.',
        examples: ['Оплата за ноябрь'],
      }),
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
      .meta({ description: 'User who registered the payment.' }),
    createdAt: z.iso.datetime().meta({
      description: 'Creation date in ISO 8601 format.',
      examples: ['2026-10-24T12:00:00.000Z'],
    }),
  })
  .meta({
    id: 'PaymentResponse',
    description: 'Student payment with the credited lesson package.',
  });

export type PaymentResponseDto = z.infer<typeof paymentResponseSchema>;

export const paymentListResponseSchema = z
  .object({
    items: z.array(paymentResponseSchema),
    total: z
      .number()
      .int()
      .meta({
        description: 'Total number of payments matching the filters.',
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
        description: 'Number of skipped payments.',
        examples: [0],
      }),
    summary: z
      .object({
        totalAmount: z.string().meta({
          description:
            'Sum of completed payments matching the filters, as a decimal string.',
          examples: ['96000.00'],
        }),
        paymentsCount: z
          .number()
          .int()
          .meta({
            description: 'Number of completed payments matching the filters.',
            examples: [8],
          }),
        lessonsCount: z
          .number()
          .int()
          .meta({
            description:
              'Lessons credited by completed payments matching the filters.',
            examples: [64],
          }),
      })
      .meta({
        description: 'Totals over all pages (completed payments only).',
      }),
  })
  .meta({
    id: 'PaymentListResponse',
    description: 'Page of student payments with totals.',
  });

export type PaymentListResponseDto = z.infer<typeof paymentListResponseSchema>;
