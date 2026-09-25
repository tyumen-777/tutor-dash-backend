import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),

  HTTP_HOST: z.string().min(1).default('0.0.0.0'),

  HTTP_PORT: z.coerce.number().int().positive().default(3000),

  DATABASE_URL: z.string().min(1),

  BETTER_AUTH_SECRET: z.string().min(32),

  BETTER_AUTH_URL: z.string().url(),

  FRONTEND_ORIGIN: z.string().url(),

  SAAS_ADMIN_EMAILS: z
    .string()
    .min(1)
    .transform((value) =>
      value
        .split(',')
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean),
    )
    .pipe(z.array(z.email()).min(1)),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): Env {
  const parsed = envSchema.safeParse(config);

  if (!parsed.success) {
    const errors = parsed.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('\n');

    throw new Error(`Invalid environment variables:\n${errors}`);
  }

  return parsed.data;
}
