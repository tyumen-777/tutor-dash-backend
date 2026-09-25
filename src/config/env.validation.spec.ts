import { describe, expect, it } from 'vitest';

import { validateEnv } from './env.validation.js';

describe('validateEnv', () => {
  it('accepts auth environment variables', () => {
    const env = validateEnv({
      DATABASE_URL: 'postgresql://root:secret@localhost:5432/tutor_dash_db',
      BETTER_AUTH_SECRET: 'development-better-auth-secret-change-me',
      BETTER_AUTH_URL: 'http://localhost:4000',
      FRONTEND_ORIGIN: 'http://localhost:3000',
      SAAS_ADMIN_EMAILS: 'admin@example.com, OWNER@Example.COM ',
    });

    expect(env.BETTER_AUTH_URL).toBe('http://localhost:4000');
    expect(env.FRONTEND_ORIGIN).toBe('http://localhost:3000');
    expect(env.SAAS_ADMIN_EMAILS).toEqual([
      'admin@example.com',
      'owner@example.com',
    ]);
  });
});
