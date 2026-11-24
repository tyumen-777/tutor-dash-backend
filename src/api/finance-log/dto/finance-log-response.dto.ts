import { z } from 'zod';

import {
  financeLogActionSchema,
  financeLogEntitySchema,
} from './list-finance-logs-query.dto.js';

export const financeLogResponseSchema = z
  .object({
    id: z.uuid().meta({
      description: 'Log entry ID.',
      examples: ['01929b3e-7c4a-7d2e-9f6b-1c2d3e4f5a6b'],
    }),
    createdAt: z.iso.datetime().meta({
      description: 'When the operation was made, ISO 8601.',
      examples: ['2026-11-14T09:30:00.000Z'],
    }),
    action: financeLogActionSchema,
    entityType: financeLogEntitySchema,
    entityId: z.uuid().meta({
      description: 'ID of the payment, or of the SALARY expense for a payout.',
      examples: ['01929b3e-7c4a-7d2e-9f6b-1c2d3e4f5a6b'],
    }),
    description: z.string().meta({
      description:
        'Human-readable description fixed at the moment of the operation.',
      examples: [
        'Оплата Анна Смирнова от 10.11.2026: сумма 8 000 ₽ → 10 000 ₽',
      ],
    }),
    actor: z
      .object({
        id: z
          .string()
          .meta({ description: 'User ID.', examples: ['user_123'] }),
        name: z
          .string()
          .meta({ description: 'User name.', examples: ['Иван Петров'] }),
      })
      .meta({ description: 'Employee who made the operation.' }),
    student: z
      .object({
        id: z.uuid().meta({
          description: 'Student ID.',
          examples: ['01929b3e-7c4a-7d2e-9f6b-1c2d3e4f5a6b'],
        }),
        firstName: z
          .string()
          .meta({ description: 'First name.', examples: ['Анна'] }),
        lastName: z
          .string()
          .nullable()
          .meta({ description: 'Last name.', examples: ['Смирнова'] }),
      })
      .nullable()
      .meta({ description: 'Related student, if any.' }),
    teacher: z
      .object({
        id: z.uuid().meta({
          description: 'Teacher ID.',
          examples: ['01929b3e-7c4a-7d2e-9f6b-1c2d3e4f5a6b'],
        }),
        fullName: z
          .string()
          .meta({ description: 'Full name.', examples: ['Ольга Пудовкина'] }),
      })
      .nullable()
      .meta({ description: 'Related teacher, if any (payouts).' }),
  })
  .meta({
    id: 'FinanceLogResponse',
    description: 'One entry of the finance operations history.',
  });

export type FinanceLogResponseDto = z.infer<typeof financeLogResponseSchema>;

export const financeLogListResponseSchema = z
  .object({
    items: z.array(financeLogResponseSchema),
    total: z
      .number()
      .int()
      .meta({
        description: 'Total number of entries matching the filters.',
        examples: [42],
      }),
    limit: z
      .number()
      .int()
      .meta({ description: 'Page size.', examples: [50] }),
    offset: z
      .number()
      .int()
      .meta({ description: 'Number of skipped entries.', examples: [0] }),
  })
  .meta({
    id: 'FinanceLogListResponse',
    description: 'Page of the finance operations history, newest first.',
  });

export type FinanceLogListResponseDto = z.infer<
  typeof financeLogListResponseSchema
>;
