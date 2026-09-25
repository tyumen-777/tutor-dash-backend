import { z } from 'zod';

export const loginSchema = z
  .object({
    email: z.string().trim().toLowerCase().pipe(z.email()),
    password: z.string().min(1).max(128),
  })
  .strict();

export type LoginDto = z.infer<typeof loginSchema>;
