import { describe, expect, it } from 'vitest';

import { cancelLessonSchema } from './cancel-lesson.dto.js';
import { createLessonSchema } from './create-lesson.dto.js';
import { deleteLessonSchema } from './delete-lesson.dto.js';
import { listLessonsQuerySchema } from './list-lessons-query.dto.js';
import { updateLessonSchema } from './update-lesson.dto.js';

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

describe('updateLessonSchema', () => {
  it('accepts a partial update and keeps an empty string to clear text', () => {
    expect(
      updateLessonSchema.parse({ durationMin: '60', topic: ' ', homework: '' }),
    ).toEqual({ durationMin: 60, topic: '', homework: '' });
  });

  it.each([
    ['student change', { studentId: '01929b3e-7c4a-7d2e-9f6b-1c2d3e4f5a6b' }],
    ['30 minutes', { durationMin: 30 }],
    ['invalid start', { startsAt: '24.10.2026 18:00' }],
    ['status change', { status: 'CANCELED' }],
  ])('rejects %s', (_, body) => {
    expect(updateLessonSchema.safeParse(body).success).toBe(false);
  });
});

describe('cancelLessonSchema', () => {
  it('drops an empty reason', () => {
    expect(cancelLessonSchema.parse({ reason: ' ' })).toEqual({});
  });
});

describe('deleteLessonSchema', () => {
  it('trims the reason', () => {
    expect(deleteLessonSchema.parse({ reason: ' Внесено дважды ' })).toEqual({
      reason: 'Внесено дважды',
    });
  });

  it.each([
    ['a missing reason', {}],
    ['a blank reason', { reason: '   ' }],
    ['a too short reason', { reason: 'ой' }],
  ])('rejects %s', (_, body) => {
    expect(deleteLessonSchema.safeParse(body).success).toBe(false);
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
