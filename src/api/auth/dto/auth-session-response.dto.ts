import { z } from 'zod';

export const authSessionResponseSchema = z
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
          examples: ['John Doe'],
        }),
      })
      .meta({ description: 'Authenticated user.' }),
    session: z
      .object({
        id: z.string().meta({
          description: 'Session ID.',
          examples: ['ses_01J9Z8K3M2N4P5Q6R7S8T9V0W1'],
        }),
        activeOrganizationId: z
          .string()
          .nullable()
          .meta({
            description: 'ID of the active organization, if any.',
            examples: ['org_01J9Z8K3M2N4P5Q6R7S8T9V0W1'],
          }),
      })
      .meta({ description: 'Active session.' }),
  })
  .meta({
    id: 'AuthSessionResponse',
    description: 'Authenticated user and active session.',
  });

export type AuthSessionResponseDto = z.infer<typeof authSessionResponseSchema>;
