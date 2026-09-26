import { z } from 'zod';

export const organizationMemberRoleSchema = z.enum([
  'admin',
  'manager',
  'teacher',
  'accountant',
]).meta({
  id: 'OrganizationMemberRole',
  description: 'Role granted to an invited organization member.',
  example: 'teacher',
});

export const createInvitationSchema = z
  .object({
    email: z.string().trim().toLowerCase().pipe(
      z.email().meta({
        description: 'Email address of the invited user.',
        example: 'teacher@example.com',
      }),
    ),
    role: organizationMemberRoleSchema,
  })
  .strict()
  .meta({
    id: 'CreateInvitationRequest',
    description: 'Payload for inviting a user into the active organization.',
  });

export type CreateInvitationDto = z.infer<typeof createInvitationSchema>;
