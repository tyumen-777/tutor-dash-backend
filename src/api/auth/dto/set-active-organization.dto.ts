import { z } from 'zod';

export const setActiveOrganizationSchema = z
  .object({
    organizationId: z.string().trim().min(1).meta({
      description: 'ID of the organization to make active.',
      example: 'org_01J9Z8K3M2N4P5Q6R7S8T9V0W1',
    }),
  })
  .strict()
  .meta({
    id: 'SetActiveOrganizationRequest',
    description: 'Payload for choosing the active organization of the session.',
  });

export type SetActiveOrganizationDto = z.infer<
  typeof setActiveOrganizationSchema
>;
