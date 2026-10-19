import { z } from 'zod';

export const loginSchema = z
  .object({
    email: z
      .string()
      .trim()
      .toLowerCase()
      .pipe(
        z.email().meta({
          description: 'User email address.',
          examples: ['owner@example.com'],
        }),
      ),
    password: z
      .string()
      .min(1)
      .max(128)
      .meta({
        description: 'User password.',
        examples: ['correct-horse-battery-staple'],
      }),
  })
  .strict()
  .meta({
    id: 'LoginRequest',
    description: 'Credentials for signing in.',
  });

export type LoginDto = z.infer<typeof loginSchema>;
