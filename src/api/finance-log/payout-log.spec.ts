import { describe, expect, it } from 'vitest';

import {
  describePayoutCanceled,
  describePayoutCreated,
  type PayoutSnapshot,
} from './payout-log.js';

const payout: PayoutSnapshot = {
  teacherName: 'Ольга Пудовкина',
  amount: '4130.00',
  currency: 'RUB',
  lessonsCount: 3,
  method: 'TRANSFER',
  paidOn: '2026-11-02',
  period: { from: '2026-10-01', to: '2026-10-31' },
};

describe('payout log', () => {
  it('describes a payout with its period', () => {
    expect(describePayoutCreated(payout)).toBe(
      'Выплата преподавателю Ольга Пудовкина: 4 130 ₽ · 3 зан. · период 01.10.2026–31.10.2026 · перевод · дата 02.11.2026',
    );
  });

  it('describes a canceled payout', () => {
    expect(describePayoutCanceled(payout)).toBe(
      'Отменена выплата преподавателю Ольга Пудовкина от 02.11.2026: 4 130 ₽ · 3 зан. снова к выплате',
    );
  });
});
