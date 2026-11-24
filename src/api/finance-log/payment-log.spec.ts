import { describe, expect, it } from 'vitest';

import {
  describeCanceled,
  describeCreated,
  diffPayment,
  type PaymentSnapshot,
} from './payment-log.js';

const base: PaymentSnapshot = {
  amount: '8000.00',
  currency: 'RUB',
  method: 'CASH',
  paidOn: '2026-11-10',
  comment: null,
  lessonsCount: 8,
  studentName: 'Анна Смирнова',
};

describe('payment log descriptions', () => {
  it('describes a new payment', () => {
    expect(describeCreated(base)).toBe(
      'Оплата от Анна Смирнова: 8 000 ₽ · 8 зан. · наличные · дата 10.11.2026',
    );
  });

  it('describes a cancellation', () => {
    expect(describeCanceled(base)).toBe(
      'Отменена оплата Анна Смирнова от 10.11.2026: 8 000 ₽ · 8 зан.',
    );
  });

  it('lists only changed fields', () => {
    const diff = diffPayment(base, {
      ...base,
      amount: '10000.50',
      lessonsCount: 10,
      method: 'TRANSFER',
    });

    expect(diff?.description).toBe(
      'Оплата Анна Смирнова от 10.11.2026: сумма 8 000 ₽ → 10 000,5 ₽; занятий 8 → 10; способ наличные → перевод',
    );
    expect(diff?.changes).toEqual({
      amount: { from: '8000.00', to: '10000.50' },
      lessonsCount: { from: 8, to: 10 },
      method: { from: 'CASH', to: 'TRANSFER' },
    });
  });

  it('describes date and comment changes', () => {
    const diff = diffPayment(
      { ...base, comment: 'старый' },
      { ...base, paidOn: '2026-11-12', comment: null },
    );

    expect(diff?.description).toBe(
      'Оплата Анна Смирнова от 10.11.2026: дата 10.11.2026 → 12.11.2026; комментарий удалён',
    );
  });

  it('returns null when nothing changed', () => {
    expect(diffPayment(base, { ...base })).toBeNull();
  });
});
