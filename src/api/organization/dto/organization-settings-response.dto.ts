import { z } from 'zod';

export const organizationSettingsResponseSchema = z
  .object({
    id: z.string().meta({
      description: 'Organization ID.',
      examples: ['org_01J9Z8K3M2N4P5Q6R7S8T9V0W1'],
    }),
    name: z.string().meta({
      description: 'Display name of the organization.',
      examples: ['Tutor Dash Academy'],
    }),
    slug: z.string().meta({
      description: 'URL-safe organization slug.',
      examples: ['tutor-dash-academy'],
    }),
    timezone: z.string().meta({
      description: 'IANA timezone of the school.',
      examples: ['Europe/Moscow'],
    }),
    currency: z.string().meta({
      description: 'ISO 4217 currency code of the school.',
      examples: ['RUB'],
    }),
  })
  .meta({
    id: 'OrganizationSettingsResponse',
    description: 'School details shown on the settings page.',
  });

export type OrganizationSettingsResponseDto = z.infer<
  typeof organizationSettingsResponseSchema
>;
