import { describe, expect, it } from 'vitest';

import { listStudentsQuerySchema } from './list-students-query.dto.js';

describe('listStudentsQuerySchema', () => {
  it('applies defaults', () => {
    expect(listStudentsQuerySchema.parse({})).toEqual({
      limit: 20,
      offset: 0,
    });
  });

  it('coerces query string values', () => {
    expect(
      listStudentsQuerySchema.parse({
        search: ' Смирнова ',
        status: 'LEAD',
        teacherId: '01929b3e-7c4a-7d2e-9f6b-1c2d3e4f5a6b',
        limit: '50',
        offset: '100',
      }),
    ).toEqual({
      search: 'Смирнова',
      status: 'LEAD',
      teacherId: '01929b3e-7c4a-7d2e-9f6b-1c2d3e4f5a6b',
      limit: 50,
      offset: 100,
    });
  });

  it.each([
    ['limit above 100', { limit: '101' }],
    ['zero limit', { limit: '0' }],
    ['negative offset', { offset: '-1' }],
    ['unknown status', { status: 'active' }],
    ['invalid teacher id', { teacherId: 'abc' }],
    ['unknown field', { sort: 'name' }],
  ])('rejects %s', (_, query) => {
    expect(listStudentsQuerySchema.safeParse(query).success).toBe(false);
  });
});
