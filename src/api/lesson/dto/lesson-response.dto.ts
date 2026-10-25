import { z } from 'zod';

import { lessonStatusSchema } from './list-lessons-query.dto.js';

export const lessonResponseSchema = z
  .object({
    id: z.uuid().meta({
      description: 'Lesson ID.',
      examples: ['01929b3e-7c4a-7d2e-9f6b-1c2d3e4f5a6d'],
    }),
    startsAt: z.iso.datetime().meta({
      description: 'Lesson start in ISO 8601 format.',
      examples: ['2026-10-24T15:00:00.000Z'],
    }),
    durationMin: z
      .number()
      .int()
      .meta({
        description: 'Lesson duration in minutes.',
        examples: [60],
      }),
    status: lessonStatusSchema.meta({
      description: 'Lesson status.',
      examples: ['COMPLETED'],
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
      .nullable()
      .meta({ description: 'Student of the individual lesson.' }),
    teacher: z
      .object({
        id: z.uuid().meta({
          description: 'Teacher ID.',
          examples: ['01929b3e-7c4a-7d2e-9f6b-1c2d3e4f5a6c'],
        }),
        fullName: z.string().meta({
          description: 'Full name of the teacher.',
          examples: ['Мария Иванова'],
        }),
      })
      .meta({ description: 'Teacher who gave the lesson.' }),
    teacherRate: z
      .string()
      .nullable()
      .meta({
        description:
          'Hourly rate of the teacher fixed when the lesson was held, as a decimal string.',
        examples: ['1050.00'],
      }),
    teacherPay: z
      .string()
      .nullable()
      .meta({
        description:
          'Amount credited to the teacher for the lesson, as a decimal string.',
        examples: ['790.00'],
      }),
    currency: z.string().meta({
      description: 'ISO 4217 currency code of the organization.',
      examples: ['RUB'],
    }),
    topic: z
      .string()
      .nullable()
      .meta({ description: 'Lesson topic.', examples: ['Present Perfect'] }),
    homework: z
      .string()
      .nullable()
      .meta({ description: 'Homework.', examples: ['Workbook p. 12'] }),
    cancelReason: z
      .string()
      .nullable()
      .meta({
        description: 'Why the lesson was canceled.',
        examples: ['Добавлено по ошибке'],
      }),
    createdAt: z.iso.datetime().meta({
      description: 'Creation date in ISO 8601 format.',
      examples: ['2026-10-24T16:05:00.000Z'],
    }),
  })
  .meta({
    id: 'LessonResponse',
    description: 'Lesson with the student, teacher and teacher pay.',
  });

export type LessonResponseDto = z.infer<typeof lessonResponseSchema>;

export const lessonListResponseSchema = z
  .object({
    items: z.array(lessonResponseSchema),
    total: z
      .number()
      .int()
      .meta({
        description: 'Total number of lessons matching the filters.',
        examples: [42],
      }),
    limit: z
      .number()
      .int()
      .meta({ description: 'Page size.', examples: [20] }),
    offset: z
      .number()
      .int()
      .meta({ description: 'Number of skipped lessons.', examples: [0] }),
    summary: z
      .object({
        lessonsCount: z
          .number()
          .int()
          .meta({
            description: 'Held lessons matching the filters.',
            examples: [24],
          }),
        teacherPayTotal: z.string().meta({
          description:
            'Sum credited to teachers for held lessons matching the filters, as a decimal string.',
          examples: ['21600.00'],
        }),
        canceledCount: z
          .number()
          .int()
          .meta({
            description: 'Canceled lessons matching the filters.',
            examples: [2],
          }),
      })
      .meta({ description: 'Totals over all pages.' }),
  })
  .meta({
    id: 'LessonListResponse',
    description: 'Page of lessons with totals.',
  });

export type LessonListResponseDto = z.infer<typeof lessonListResponseSchema>;
