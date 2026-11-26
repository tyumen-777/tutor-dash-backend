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

describe('updateOrganizationSchema lowBalanceNotifyAt', () => {
  it('accepts a threshold or null', () => {
    expect(
      updateOrganizationSchema.safeParse({ lowBalanceNotifyAt: 2 }).success,
    ).toBe(true);
    expect(
      updateOrganizationSchema.safeParse({ lowBalanceNotifyAt: null }).success,
    ).toBe(true);
  });

  it('rejects out-of-range values', () => {
    expect(
      updateOrganizationSchema.safeParse({ lowBalanceNotifyAt: -1 }).success,
    ).toBe(false);
    expect(
      updateOrganizationSchema.safeParse({ lowBalanceNotifyAt: 21 }).success,
    ).toBe(false);
    expect(
      updateOrganizationSchema.safeParse({ lowBalanceNotifyAt: 1.5 }).success,
    ).toBe(false);
  });
});
