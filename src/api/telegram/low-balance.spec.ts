import { describe, expect, it } from 'vitest';

import {
  buildLowBalanceText,
  crossedLowBalance,
  pluralizeLessons,
} from './low-balance.js';
import { retryDelayMs } from './notification-sender.js';
import { buildChatUnlinkedText } from './student-telegram.service.js';

describe('crossedLowBalance', () => {
  it('fires once when the balance drops to the threshold', () => {
    expect(crossedLowBalance(2, 3, 2)).toBe(true);
    expect(crossedLowBalance(2, 2, 1)).toBe(false);
    expect(crossedLowBalance(2, 4, 3)).toBe(false);
  });

  it('supports threshold 0 and the off state', () => {
    expect(crossedLowBalance(0, 1, 0)).toBe(true);
    expect(crossedLowBalance(null, 1, 0)).toBe(false);
  });
});

describe('pluralizeLessons', () => {
  it.each([
    [1, '1 занятие'],
    [2, '2 занятия'],
    [5, '5 занятий'],
    [11, '11 занятий'],
    [12, '12 занятий'],
    [21, '21 занятие'],
    [22, '22 занятия'],
  ])('%i → %s', (count, text) => {
    expect(pluralizeLessons(count)).toBe(text);
  });
});

describe('buildLowBalanceText', () => {
  it('mentions the student, the school and the balance', () => {
    const text = buildLowBalanceText({
      firstName: 'Маша',
      schoolName: 'English Club',
      lessonsLeft: 2,
    });

    expect(text).toContain('Маша');
    expect(text).toContain('«English Club»');
    expect(text).toContain('осталось 2 занятия');
    expect(text.startsWith('❗️❗️❗️')).toBe(true);
  });

  it('says lessons are over at zero', () => {
    expect(
      buildLowBalanceText({
        firstName: 'Маша',
        schoolName: 'X',
        lessonsLeft: 0,
      }),
    ).toContain('оплаченные занятия закончились');
  });
});

describe('retryDelayMs', () => {
  it('doubles the delay', () => {
    expect(retryDelayMs(1)).toBe(60_000);
    expect(retryDelayMs(3)).toBe(240_000);
  });
});

describe('buildChatUnlinkedText', () => {
  it('names the student and the school', () => {
    expect(buildChatUnlinkedText('Вероника', 'englishbooster')).toBe(
      'Уведомления по ученику Вероника отключены школой «englishbooster».',
    );
  });
});
