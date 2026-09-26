import { describe, expect, it } from 'vitest';

import { acceptInvitationSchema } from './accept-invitation.dto.js';
import { createInvitationSchema } from './create-invitation.dto.js';

describe('createInvitationSchema', () => {
  it('normalizes email and accepts allowed organization roles', () => {
    const result = createInvitationSchema.parse({
      email: ' Manager@Example.COM ',
      role: 'manager',
    });

    expect(result.email).toBe('manager@example.com');
  });

  it('rejects owner role invitations', () => {
    const result = createInvitationSchema.safeParse({
      email: 'owner@example.com',
      role: 'owner',
    });

    expect(result.success).toBe(false);
  });
});

describe('acceptInvitationSchema', () => {
  it('accepts empty body for existing logged-in users', () => {
    expect(acceptInvitationSchema.parse({})).toEqual({});
  });

  it('accepts name and password for new users', () => {
    const result = acceptInvitationSchema.parse({
      name: 'Manager Name',
      password: 'password123',
    });

    expect(result.name).toBe('Manager Name');
  });
});
