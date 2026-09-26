import { z } from 'zod';

export const acceptInvitationSchema = z
  .object({
    name: z.string().trim().min(1).optional().meta({
      description: 'Name to set when accepting the invitation.',
      example: 'Grace Hopper',
    }),
    password: z.string().min(8).max(128).optional().meta({
      description: 'Password to set when the invited user creates an account.',
      example: 'correct-horse-battery-staple',
    }),
  })
  .strict()
  .meta({
    id: 'AcceptInvitationRequest',
    description: 'Payload for accepting an organization invitation.',
  });

export type AcceptInvitationDto = z.infer<typeof acceptInvitationSchema>;
