import { z } from 'zod';

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

// Валюта и slug не меняются: валюта записана в каждой оплате и расходе
export const updateOrganizationSchema = z
  .object({
    name: organizationNameSchema.optional(),
    timezone: organizationTimezoneSchema.optional(),
  })
  .strict()
  .refine((dto) => dto.name !== undefined || dto.timezone !== undefined, {
    message: 'At least one field is required',
  })
  .meta({
    id: 'UpdateOrganizationRequest',
    description: 'School details to change. Currency and slug are read-only.',
  });

export type UpdateOrganizationDto = z.infer<typeof updateOrganizationSchema>;
