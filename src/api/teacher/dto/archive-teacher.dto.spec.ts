import { describe, expect, it } from 'vitest';

import { archiveTeacherSchema } from './archive-teacher.dto.js';

describe('archiveTeacherSchema', () => {
  it('accepts missing body', () => {
    expect(archiveTeacherSchema.parse(undefined)).toEqual({});
  });

  it('accepts end date', () => {
    expect(archiveTeacherSchema.parse({ endedOn: '2026-10-20' })).toEqual({
      endedOn: '2026-10-20',
    });
  });

  it('rejects invalid end date', () => {
    expect(
      archiveTeacherSchema.safeParse({ endedOn: '20.10.2026' }).success,
    ).toBe(false);
  });
});
