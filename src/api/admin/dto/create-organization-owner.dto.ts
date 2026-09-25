import { z } from 'zod';

export const createOrganizationOwnerSchema = z
  .object({
    organizationName: z.string().trim().min(1),
    organizationSlug: z
      .string()
      .trim()
      .min(1)
      .max(80)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .optional(),
    ownerEmail: z.string().trim().toLowerCase().pipe(z.email()),
    ownerName: z.string().trim().min(1),
    ownerPassword: z.string().min(8).max(128),
  })
  .strict();

export type CreateOrganizationOwnerDto = z.infer<
  typeof createOrganizationOwnerSchema
>;
