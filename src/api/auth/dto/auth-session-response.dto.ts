import { z } from 'zod';

export const userOrganizationSchema = z
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
    role: z.string().meta({
      description: 'Role of the user in the organization.',
      examples: ['owner'],
    }),
    timezone: z.string().meta({
      description:
        'IANA timezone of the organization. Lesson times and reporting periods are shown in it.',
      examples: ['Europe/Moscow'],
    }),
    currency: z.string().meta({
      description: 'ISO 4217 currency code of the organization.',
      examples: ['RUB'],
    }),
  })
  .meta({
    id: 'UserOrganization',
    description: 'Organization the user is a member of.',
  });

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
    organizations: z.array(userOrganizationSchema).meta({
      description:
        'Organizations the user is a member of. When there are several and activeOrganizationId is null, the client should ask the user to choose one.',
    }),
  })
  .meta({
    id: 'AuthSessionResponse',
    description: 'Authenticated user and active session.',
  });

export type AuthSessionResponseDto = z.infer<typeof authSessionResponseSchema>;

export type UserOrganizationDto = z.infer<typeof userOrganizationSchema>;
