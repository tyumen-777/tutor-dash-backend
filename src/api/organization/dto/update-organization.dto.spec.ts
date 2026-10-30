import { describe, expect, it } from 'vitest';

import { updateOrganizationSchema } from './update-organization.dto.js';

describe('updateOrganizationSchema', () => {
  it('trims name and timezone', () => {
    expect(
      updateOrganizationSchema.parse({
        name: '  Школа английского  ',
        timezone: ' Asia/Yekaterinburg ',
      }),
    ).toEqual({ name: 'Школа английского', timezone: 'Asia/Yekaterinburg' });
  });

  it('accepts a single field', () => {
    expect(updateOrganizationSchema.parse({ timezone: 'UTC' })).toEqual({
      timezone: 'UTC',
    });
  });

  it.each([
    ['empty body', {}],
    ['blank name', { name: '   ' }],
    ['long name', { name: 'a'.repeat(101) }],
    ['unknown timezone', { timezone: 'Mars/Olympus' }],
    ['currency', { name: 'Школа', currency: 'USD' }],
    ['slug', { name: 'Школа', slug: 'new-slug' }],
  ])('rejects %s', (_, body) => {
    expect(updateOrganizationSchema.safeParse(body).success).toBe(false);
  });
});
