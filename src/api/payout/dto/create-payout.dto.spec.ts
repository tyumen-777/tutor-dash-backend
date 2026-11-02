import { describe, expect, it } from 'vitest';

import { createPayoutSchema } from './create-payout.dto.js';
import { payoutReportQuerySchema } from './payout-report-query.dto.js';

const teacherId = '01929b3e-7c4a-7d2e-9f6b-1c2d3e4f5a6b';

const validPayout = {
  teacherId,
  from: '2026-10-01',
  to: '2026-10-31',
  paidOn: '2026-11-02',
  method: 'TRANSFER',
  comment: ' ',
};

describe('createPayoutSchema', () => {
  it('drops an empty comment', () => {
    expect(createPayoutSchema.parse(validPayout)).toEqual({
      teacherId,
      from: '2026-10-01',
      to: '2026-10-31',
      paidOn: '2026-11-02',
      method: 'TRANSFER',
    });
  });

  it('accepts a one-day period', () => {
    expect(
      createPayoutSchema.safeParse({ ...validPayout, to: '2026-10-01' })
        .success,
    ).toBe(true);
  });

  it('rejects a period that ends before it starts', () => {
    expect(
      createPayoutSchema.safeParse({ ...validPayout, from: '2026-11-01' })
        .success,
    ).toBe(false);
  });

  it('rejects an amount: it is calculated from the lessons', () => {
    expect(
      createPayoutSchema.safeParse({ ...validPayout, amount: 1000 }).success,
    ).toBe(false);
  });
});

describe('payoutReportQuerySchema', () => {
  it('requires both dates', () => {
    expect(
      payoutReportQuerySchema.safeParse({ from: '2026-10-01' }).success,
    ).toBe(false);
  });

  it('rejects a reversed period', () => {
    expect(
      payoutReportQuerySchema.safeParse({
        from: '2026-10-31',
        to: '2026-10-01',
      }).success,
    ).toBe(false);
  });
});
