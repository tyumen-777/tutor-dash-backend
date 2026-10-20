import { describe, expect, it } from 'vitest';

import { listTeachersQuerySchema } from './list-teachers-query.dto.js';

describe('listTeachersQuerySchema', () => {
  it('applies defaults', () => {
    expect(listTeachersQuerySchema.parse({})).toEqual({
      status: 'active',
      limit: 20,
      offset: 0,
    });
  });

  it('coerces query string values', () => {
    const result = listTeachersQuerySchema.parse({
      search: ' Иванова ',
      status: 'archived',
      limit: '50',
      offset: '100',
    });

    expect(result).toEqual({
      search: 'Иванова',
      status: 'archived',
      limit: 50,
      offset: 100,
    });
  });

  it.each([
    ['limit above 100', { limit: '101' }],
    ['zero limit', { limit: '0' }],
    ['negative offset', { offset: '-1' }],
    ['unknown status', { status: 'inactive' }],
    ['unknown field', { sort: 'name' }],
  ])('rejects %s', (_, query) => {
    expect(listTeachersQuerySchema.safeParse(query).success).toBe(false);
  });
});
