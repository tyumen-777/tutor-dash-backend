import { z } from 'zod';

import { LOW_BALANCE_NOTIFY_MAX } from '../../telegram/low-balance.js';
import { isTimezone } from '../../shared/timezone.js';

export const organizationNameSchema = z.string().trim().min(1).max(100).meta({
  description: 'Display name of the organization.',
  example: 'Tutor Dash Academy',
});

export const organizationTimezoneSchema = z
  .string()
  .trim()
  .refine(isTimezone, 'Unknown IANA timezone')
  .meta({
    description:
      'IANA timezone of the school: day boundaries for lessons and monthly totals.',
    example: 'Europe/Moscow',
  });

export const lowBalanceNotifyAtSchema = z
  .number()
  .int()
  .min(0)
  .max(LOW_BALANCE_NOTIFY_MAX)
  .nullable()
  .meta({
    description:
      'Notify the student in Telegram when this many paid lessons are left; null turns the notification off.',
    example: 1,
  });

// Валюта и slug не меняются: валюта записана в каждой оплате и расходе
export const updateOrganizationSchema = z
  .object({
    name: organizationNameSchema.optional(),
    timezone: organizationTimezoneSchema.optional(),
    lowBalanceNotifyAt: lowBalanceNotifyAtSchema.optional(),
    notifyLessonCompleted: z.boolean().optional().meta({
      description:
        'Send the student a Telegram message after each held lesson with the lessons left.',
    }),
  })
  .strict()
  .refine((dto) => Object.values(dto).some((value) => value !== undefined), {
    message: 'At least one field is required',
  })
  .meta({
    id: 'UpdateOrganizationRequest',
    description: 'School details to change. Currency and slug are read-only.',
  });

export type UpdateOrganizationDto = z.infer<typeof updateOrganizationSchema>;
