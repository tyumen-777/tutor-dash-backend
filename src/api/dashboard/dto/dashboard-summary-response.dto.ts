import { z } from 'zod';

const money = (description: string, example: string) =>
  z.string().meta({ description, examples: [example] });

const count = (description: string, example: number) =>
  z
    .number()
    .int()
    .meta({ description, examples: [example] });

const studentRefSchema = z.object({
  id: z.uuid().meta({ description: 'Student ID.' }),
  firstName: z.string().meta({ description: 'First name of the student.' }),
  lastName: z
    .string()
    .nullable()
    .meta({ description: 'Last name of the student.' }),
});

const dashboardLessonSchema = z.object({
  id: z.uuid().meta({ description: 'Lesson ID.' }),
  startsAt: z.iso.datetime().meta({
    description: 'Lesson start in ISO 8601 format.',
    examples: ['2026-10-30T15:00:00.000Z'],
  }),
  durationMin: count('Lesson duration in minutes.', 60),
  status: z
    .enum(['SCHEDULED', 'COMPLETED', 'CANCELED', 'RESCHEDULED'])
    .meta({ description: 'Lesson status.', examples: ['COMPLETED'] }),
  topic: z.string().nullable().meta({ description: 'Lesson topic.' }),
  teacher: z.object({
    id: z.uuid().meta({ description: 'Teacher ID.' }),
    fullName: z.string().meta({ description: 'Full name of the teacher.' }),
  }),
  student: studentRefSchema
    .nullable()
    .meta({ description: 'Student of the individual lesson.' }),
});

const teacherWorkloadSchema = z.object({
  id: z.uuid().meta({ description: 'Teacher ID.' }),
  fullName: z.string().meta({ description: 'Full name of the teacher.' }),
  lessonsCount: count('Completed lessons this month.', 24),
  minutes: count('Minutes of completed lessons this month.', 1380),
  studentsCount: count('Distinct students taught this month.', 9),
});

const lowBalanceStudentSchema = studentRefSchema.extend({
  lessonsLeft: count('Paid lessons left.', 1),
});

export const dashboardSummaryResponseSchema = z
  .object({
    currency: z.string().meta({
      description: 'ISO 4217 currency code of the organization.',
      examples: ['RUB'],
    }),
    today: z.iso.date().meta({
      description: 'Today in the school timezone (YYYY-MM-DD).',
      examples: ['2026-10-30'],
    }),
    period: z
      .object({
        from: z.iso.date().meta({ examples: ['2026-10-01'] }),
        to: z.iso.date().meta({ examples: ['2026-10-30'] }),
      })
      .meta({ description: 'Current month up to today.' }),
    income: z
      .object({
        amount: money('Completed payments this month.', '342000.00'),
        previousAmount: money(
          'Completed payments for the same days of the previous month.',
          '305000.00',
        ),
        paymentsCount: count('Completed payments this month.', 41),
      })
      .meta({ description: 'Money received from students.' }),
    expenses: z
      .object({
        paidAmount: money('Paid expenses this month.', '185000.00'),
        pendingAmount: money(
          'Unpaid expenses of any date, not canceled.',
          '12000.00',
        ),
        pendingCount: count('Unpaid expenses of any date.', 2),
      })
      .nullable()
      .meta({
        description:
          'School expenses. Null for roles without access to expenses.',
      }),
    profit: money(
      'Income minus paid expenses this month. Null without access to expenses.',
      '157000.00',
    ).nullable(),
    students: z.object({
      activeCount: count('Active students.', 418),
      pausedCount: count('Students on pause.', 18),
      newCount: count('Students added in the last 30 days.', 23),
      lowBalanceCount: count(
        'Active students with 0 or 1 paid lesson left.',
        7,
      ),
    }),
    lessons: z.object({
      todayCount: count('Lessons today, not canceled or rescheduled.', 12),
      completedCount: count('Completed lessons this month.', 240),
      canceledCount: count('Canceled lessons this month.', 6),
      teacherPayTotal: money(
        'Teacher pay for completed lessons this month.',
        '96000.00',
      ),
    }),
    todayLessons: z
      .array(dashboardLessonSchema)
      .meta({ description: 'All lessons of today, earliest first.' }),
    teachers: z.array(teacherWorkloadSchema).meta({
      description: 'Active teachers by completed lessons this month.',
    }),
    lowBalanceStudents: z.array(lowBalanceStudentSchema).meta({
      description: 'Up to 5 active students with the fewest lessons left.',
    }),
  })
  .meta({
    id: 'DashboardSummaryResponse',
    description: 'Key school numbers for the overview page.',
  });

export type DashboardSummaryResponseDto = z.infer<
  typeof dashboardSummaryResponseSchema
>;
