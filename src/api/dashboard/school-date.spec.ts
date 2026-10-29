import { describe, expect, it } from 'vitest';

import {
  addDays,
  previousMonthRange,
  schoolToday,
  startOfSchoolDay,
} from './school-date.js';

describe('schoolToday', () => {
  it('uses the school calendar, not UTC', () => {
    const lateEveningUtc = new Date('2026-10-30T22:30:00.000Z');

    expect(schoolToday('Europe/Moscow', lateEveningUtc)).toBe('2026-10-31');
    expect(schoolToday('UTC', lateEveningUtc)).toBe('2026-10-30');
  });
});

describe('addDays', () => {
  it('crosses month and year boundaries', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
  });
});

describe('previousMonthRange', () => {
  it('takes the same days of the previous month', () => {
    expect(previousMonthRange('2026-10-01', '2026-10-15')).toEqual({
      from: '2026-09-01',
      to: '2026-09-15',
    });
  });

  it('clamps to the end of a shorter month', () => {
    expect(previousMonthRange('2026-03-01', '2026-03-31')).toEqual({
      from: '2026-02-01',
      to: '2026-02-28',
    });
  });

  it('moves into the previous year in January', () => {
    expect(previousMonthRange('2027-01-01', '2027-01-10')).toEqual({
      from: '2026-12-01',
      to: '2026-12-10',
    });
  });
});

describe('startOfSchoolDay', () => {
  it('returns local midnight in UTC', () => {
    expect(startOfSchoolDay('2026-10-30', 'Europe/Moscow').toISOString()).toBe(
      '2026-10-29T21:00:00.000Z',
    );
  });
});
