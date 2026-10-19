import { describe, expect, it } from 'vitest';

import { loginSchema } from './login.dto.js';
import { setActiveOrganizationSchema } from './set-active-organization.dto.js';

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

describe('setActiveOrganizationSchema', () => {
  it('trims organization id', () => {
    const result = setActiveOrganizationSchema.parse({
      organizationId: ' org_1 ',
    });

    expect(result.organizationId).toBe('org_1');
  });

  it('rejects empty organization id', () => {
    const result = setActiveOrganizationSchema.safeParse({
      organizationId: ' ',
    });

    expect(result.success).toBe(false);
  });
});
