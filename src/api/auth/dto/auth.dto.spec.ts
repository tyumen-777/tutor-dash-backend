import { describe, expect, it } from 'vitest';

import { loginSchema } from './login.dto.js';

describe('loginSchema', () => {
  it('normalizes email and accepts login input', () => {
    const result = loginSchema.parse({
      email: ' Owner@Example.COM ',
      password: 'password123',
    });

    expect(result.email).toBe('owner@example.com');
  });

  it('rejects invalid login input', () => {
    const result = loginSchema.safeParse({
      email: 'not-email',
      password: '',
    });

    expect(result.success).toBe(false);
  });
});
