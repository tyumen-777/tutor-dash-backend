import { describe, expect, it } from 'vitest';

import {
  buildLessonCompletedText,
  formatLessonDate,
} from './lesson-completed.js';

const base = {
  schoolName: 'englishbooster',
  firstName: 'Вероника',
  // 12:00 UTC = 15:00 в Москве
  startsAt: new Date('2026-11-27T12:00:00.000Z'),
  timezone: 'Europe/Moscow',
  teacherName: 'Анна Смирнова',
  lessonsLeft: 4,
  lowBalance: false,
};

describe('formatLessonDate', () => {
  it('formats in the given timezone', () => {
    expect(formatLessonDate(base.startsAt, 'Europe/Moscow')).toBe('27 ноября');
    // 22:00 UTC 27-го — уже 28-е в Москве
    expect(
      formatLessonDate(new Date('2026-11-27T22:00:00.000Z'), 'Europe/Moscow'),
    ).toBe('28 ноября');
  });
});

describe('buildLessonCompletedText', () => {
  it('reports the lesson and the balance', () => {
    const text = buildLessonCompletedText(base);

    expect(text).toContain('✅ Занятие проведено — «englishbooster»');
    expect(text).toContain('Ученик: Вероника');
    expect(text).toContain('Дата: 27 ноября');
    expect(text).toContain('Преподаватель: Анна Смирнова');
    expect(text).toContain('Остаток: 4 занятия.');
    expect(text).not.toContain('15:00');
    expect(text).not.toContain('❗️');
  });

  it('warns with exclamation marks on low balance', () => {
    const text = buildLessonCompletedText({
      ...base,
      lessonsLeft: 1,
      lowBalance: true,
    });

    expect(text).toContain('❗️❗️❗️ Осталось 1 занятие.');
    expect(text).toContain('пополните абонемент');
  });

  it('says lessons are over at zero', () => {
    const text = buildLessonCompletedText({
      ...base,
      lessonsLeft: 0,
      lowBalance: true,
    });

    expect(text).toContain('❗️❗️❗️ Оплаченные занятия закончились.');
  });
});
