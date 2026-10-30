import { describe, expect, it } from 'vitest';

import { createStudyLevelSchema } from './create-study-level.dto.js';
import { updateStudyLevelSchema } from './update-study-level.dto.js';

describe('createStudyLevelSchema', () => {
  it('trims code and name', () => {
    expect(
      createStudyLevelSchema.parse({ code: ' A1 ', name: ' Beginner ' }),
    ).toEqual({ code: 'A1', name: 'Beginner' });
  });

  it.each([
    ['blank code', { code: ' ', name: 'Beginner' }],
    ['long code', { code: 'x'.repeat(21), name: 'Beginner' }],
    ['missing name', { code: 'A1' }],
    ['long name', { code: 'A1', name: 'x'.repeat(101) }],
    ['unknown field', { code: 'A1', name: 'Beginner', order: 1 }],
  ])('rejects %s', (_, body) => {
    expect(createStudyLevelSchema.safeParse(body).success).toBe(false);
  });
});

describe('updateStudyLevelSchema', () => {
  it('accepts a single field', () => {
    expect(updateStudyLevelSchema.parse({ name: 'Elementary' })).toEqual({
      name: 'Elementary',
    });
  });

  it('rejects an empty body', () => {
    expect(updateStudyLevelSchema.safeParse({}).success).toBe(false);
  });
});
