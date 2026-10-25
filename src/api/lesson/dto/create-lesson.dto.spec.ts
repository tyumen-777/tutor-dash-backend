import { describe, expect, it } from 'vitest';

import { cancelLessonSchema } from './cancel-lesson.dto.js';
import { createLessonSchema } from './create-lesson.dto.js';
import { listLessonsQuerySchema } from './list-lessons-query.dto.js';

const validLesson = {
  studentId: '01929b3e-7c4a-7d2e-9f6b-1c2d3e4f5a6b',
  teacherId: '01929b3e-7c4a-7d2e-9f6b-1c2d3e4f5a6c',
  startsAt: '2026-10-24T15:00:00.000Z',
  durationMin: '45',
  topic: ' Present Perfect ',
  homework: ' ',
};

describe('createLessonSchema', () => {
  it('coerces duration, trims text and drops empty fields', () => {
    expect(createLessonSchema.parse(validLesson)).toEqual({
      studentId: '01929b3e-7c4a-7d2e-9f6b-1c2d3e4f5a6b',
      teacherId: '01929b3e-7c4a-7d2e-9f6b-1c2d3e4f5a6c',
      startsAt: '2026-10-24T15:00:00.000Z',
      durationMin: 45,
      topic: 'Present Perfect',
    });
  });

  it('accepts a start time with an offset', () => {
    expect(
      createLessonSchema.safeParse({
        ...validLesson,
        startsAt: '2026-10-24T18:00:00+03:00',
      }).success,
    ).toBe(true);
  });

  it.each([
    ['30 minutes', { durationMin: 30 }],
    ['90 minutes', { durationMin: 90 }],
    ['invalid start', { startsAt: '24.10.2026 18:00' }],
    ['invalid teacher id', { teacherId: '42' }],
    ['unknown field', { status: 'COMPLETED' }],
  ])('rejects %s', (_, override) => {
    expect(
      createLessonSchema.safeParse({ ...validLesson, ...override }).success,
    ).toBe(false);
  });
});

describe('cancelLessonSchema', () => {
  it('drops an empty reason', () => {
    expect(cancelLessonSchema.parse({ reason: ' ' })).toEqual({});
  });
});

describe('listLessonsQuerySchema', () => {
  it('applies pagination defaults', () => {
    expect(listLessonsQuerySchema.parse({})).toEqual({ limit: 20, offset: 0 });
  });

  it('rejects a reversed period', () => {
    expect(
      listLessonsQuerySchema.safeParse({ from: '2026-10-31', to: '2026-10-01' })
        .success,
    ).toBe(false);
  });
});
