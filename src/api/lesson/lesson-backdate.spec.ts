import { describe, expect, it } from 'vitest';

import { teacherEarliestLessonStart } from './lesson-backdate.js';

describe('teacherEarliestLessonStart', () => {
  it('is midnight seven school days ago', () => {
    expect(
      teacherEarliestLessonStart('UTC', new Date('2026-11-24T15:00:00Z')),
    ).toEqual(new Date('2026-11-17T00:00:00.000Z'));
  });

  it('counts days on the school clock', () => {
    // 22:30 UTC 23 ноября — уже 24 ноября в Москве (UTC+3)
    expect(
      teacherEarliestLessonStart(
        'Europe/Moscow',
        new Date('2026-11-23T22:30:00Z'),
      ),
    ).toEqual(new Date('2026-11-16T21:00:00.000Z'));
  });
});
