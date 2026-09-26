import { z } from 'zod';

export const createOrganizationOwnerSchema = z
  .object({
    organizationName: z.string().trim().min(1).meta({
      description: 'Display name of the organization.',
      example: 'Tutor Dash Academy',
    }),
    organizationSlug: z
      .string()
      .trim()
      .min(1)
      .max(80)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .optional()
      .meta({
        description: 'URL-safe organization slug.',
        example: 'tutor-dash-academy',
      }),
    ownerEmail: z.string().trim().toLowerCase().pipe(
      z.email().meta({
        description: 'Email address for the first organization owner.',
        example: 'owner@example.com',
      }),
    ),
    ownerName: z.string().trim().min(1).meta({
      description: 'Name of the first organization owner.',
      example: 'Ada Lovelace',
    }),
    ownerPassword: z.string().min(8).max(128).meta({
      description: 'Initial password for the organization owner.',
      example: 'correct-horse-battery-staple',
    }),
  })
  .strict()
  .meta({
    id: 'CreateOrganizationOwnerRequest',
    description: 'Payload for creating an organization with its first owner.',
  });

export type CreateOrganizationOwnerDto = z.infer<
  typeof createOrganizationOwnerSchema
>;
