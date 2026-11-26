import { z } from 'zod';

const envSchema = z
  .object({
    NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('development'),

    HTTP_HOST: z.string().min(1).default('0.0.0.0'),

    HTTP_PORT: z.coerce.number().int().positive().default(3000),

    DATABASE_URL: z.string().min(1),

    BETTER_AUTH_SECRET: z.string().min(32),

    BETTER_AUTH_URL: z.string().url(),

    FRONTEND_ORIGIN: z.string().url(),

    // Общий домен для cookie сессии (например, edudash.org), чтобы её видели
    // и api.edudash.org, и edudash.org. Пусто — cookie только для домена API.
    COOKIE_DOMAIN: z.string().min(1).optional(),

    // IP или CIDR reverse proxy через запятую. Пусто — заголовкам
    // X-Forwarded-* не доверяем, IP клиента берётся из сокета.
    TRUSTED_PROXIES: z
      .string()
      .default('')
      .transform((value) =>
        value
          .split(',')
          .map((proxy) => proxy.trim())
          .filter(Boolean),
      ),

    // По умолчанию Swagger выключен в production
    SWAGGER_ENABLED: z
      .enum(['true', 'false'])
      .optional()
      .transform((value) =>
        value === undefined ? undefined : value === 'true',
      ),

    // Telegram-бот уведомлений. Без токена бот выключен.
    TELEGRAM_BOT_TOKEN: z.string().min(1).optional(),

    // Публичный HTTPS-адрес POST /telegram/webhook. Пусто — бот забирает
    // обновления long polling (для локальной разработки).
    TELEGRAM_WEBHOOK_URL: z.string().url().optional(),

    // Секрет из заголовка X-Telegram-Bot-Api-Secret-Token: 1–256 символов A-Z a-z 0-9 _ -
    TELEGRAM_WEBHOOK_SECRET: z
      .string()
      .regex(/^[A-Za-z0-9_-]{16,256}$/)
      .optional(),
  })
  .refine((env) => !env.TELEGRAM_WEBHOOK_URL || env.TELEGRAM_WEBHOOK_SECRET, {
    path: ['TELEGRAM_WEBHOOK_SECRET'],
    message: 'Required when TELEGRAM_WEBHOOK_URL is set',
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
