import { describe, expect, it } from 'vitest';

import { validateEnv } from './env.validation.js';

describe('validateEnv', () => {
  it('accepts auth environment variables', () => {
    const env = validateEnv({
      DATABASE_URL: 'postgresql://root:secret@localhost:5432/tutor_dash_db',
      BETTER_AUTH_SECRET: 'development-better-auth-secret-change-me',
      BETTER_AUTH_URL: 'http://localhost:4000',
      FRONTEND_ORIGIN: 'http://localhost:3000',
    });

    expect(env.BETTER_AUTH_URL).toBe('http://localhost:4000');
    expect(env.FRONTEND_ORIGIN).toBe('http://localhost:3000');
    expect(env.TRUSTED_PROXIES).toEqual([]);
    expect(env.SWAGGER_ENABLED).toBeUndefined();
  });

  it('parses trusted proxies and swagger flag', () => {
    const env = validateEnv({
      DATABASE_URL: 'postgresql://root:secret@localhost:5432/tutor_dash_db',
      BETTER_AUTH_SECRET: 'development-better-auth-secret-change-me',
      BETTER_AUTH_URL: 'http://localhost:4000',
      FRONTEND_ORIGIN: 'http://localhost:3000',
      TRUSTED_PROXIES: '10.0.0.1, 172.16.0.0/12',
      SWAGGER_ENABLED: 'true',
    });

    expect(env.TRUSTED_PROXIES).toEqual(['10.0.0.1', '172.16.0.0/12']);
    expect(env.SWAGGER_ENABLED).toBe(true);
  });
});
