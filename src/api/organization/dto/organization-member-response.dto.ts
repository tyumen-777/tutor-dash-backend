import { z } from 'zod';

import { organizationSummarySchema } from './invitation-response.dto.js';

export const organizationMemberResponseSchema = z
  .object({
    user: z
      .object({
        id: z.string().meta({
          description: 'User ID.',
          examples: ['usr_01J9Z8K3M2N4P5Q6R7S8T9V0W1'],
        }),
        email: z.email().meta({
          description: 'User email address.',
          examples: ['owner@example.com'],
        }),
        name: z.string().meta({
          description: 'User display name.',
          examples: ['Ada Lovelace'],
        }),
      })
      .meta({ description: 'Organization member.' }),
    organization: organizationSummarySchema,
  })
  .meta({
    id: 'OrganizationMemberResponse',
    description: 'User and the organization they are a member of.',
  });

export type OrganizationMemberResponseDto = z.infer<
  typeof organizationMemberResponseSchema
>;
