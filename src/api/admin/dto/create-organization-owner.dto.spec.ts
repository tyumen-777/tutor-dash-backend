import { describe, expect, it } from 'vitest';

import { createOrganizationOwnerSchema } from './create-organization-owner.dto.js';

describe('createOrganizationOwnerSchema', () => {
  it('normalizes owner email and accepts organization onboarding input', () => {
    const result = createOrganizationOwnerSchema.parse({
      organizationName: 'My School',
      organizationSlug: 'my-school',
      ownerEmail: ' Owner@Example.COM ',
      ownerName: 'Owner Name',
      ownerPassword: 'password123',
    });

    expect(result.ownerEmail).toBe('owner@example.com');
  });

  it('rejects invalid onboarding input', () => {
    const result = createOrganizationOwnerSchema.safeParse({
      organizationName: '',
      ownerEmail: 'not-email',
      ownerName: '',
      ownerPassword: 'short',
    });

    expect(result.success).toBe(false);
  });
});
