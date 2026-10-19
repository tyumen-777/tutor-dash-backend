import { z } from 'zod';

export const organizationSummarySchema = z
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
  })
  .meta({
    id: 'OrganizationSummary',
    description: 'Public organization data.',
  });

export const invitationResponseSchema = z
  .object({
    id: z.string().meta({
      description: 'Invitation ID.',
      examples: ['3f1c2b7e-8a4d-4e2f-9b6a-1c2d3e4f5a6b'],
    }),
    email: z.email().meta({
      description: 'Email address of the invited user.',
      examples: ['teacher@example.com'],
    }),
    role: z.string().meta({
      description: 'Role granted to the invited user.',
      examples: ['teacher'],
    }),
    status: z.string().meta({
      description:
        'Invitation status: pending, accepted, rejected or canceled.',
      examples: ['pending'],
    }),
    expiresAt: z.iso.datetime().meta({
      description: 'Invitation expiration date in ISO 8601 format.',
      examples: ['2026-10-26T12:00:00.000Z'],
    }),
    organization: organizationSummarySchema,
  })
  .meta({
    id: 'InvitationResponse',
    description: 'Organization invitation.',
  });

export type InvitationResponseDto = z.infer<typeof invitationResponseSchema>;
