import { describe, expect, it } from 'vitest';

import { SlugService } from './slug.js';

describe('SlugService', () => {
  it('normalizes organization names into slugs', () => {
    const service = new SlugService({} as never);

    expect(service.normalizeSlug(' My Cool School! ')).toBe('my-cool-school');
    expect(service.normalizeSlug('---')).toBe('organization');
  });

  it('adds a numeric suffix when the slug already exists', async () => {
    const existingSlugs = new Set(['my-school', 'my-school-2']);
    const service = new SlugService({
      organization: {
        findUnique: ({ where }: { where: { slug: string } }) =>
          Promise.resolve(
            existingSlugs.has(where.slug) ? { id: where.slug } : null,
          ),
      },
    } as never);

    await expect(
      service.createAvailableOrganizationSlug('My School'),
    ).resolves.toBe('my-school-3');
  });
});
