import { describe, expect, it } from 'vitest';

import { createPaymentSchema } from './create-payment.dto.js';
import { listPaymentsQuerySchema } from './list-payments-query.dto.js';
import { updatePaymentSchema } from './update-payment.dto.js';

const validPayment = {
  studentId: '01929b3e-7c4a-7d2e-9f6b-1c2d3e4f5a6b',
  amount: '12000.50',
  lessonsCount: '8',
  paidOn: '2026-10-24',
  method: 'TRANSFER',
  comment: ' Оплата за ноябрь ',
};

describe('createPaymentSchema', () => {
  it('coerces numbers and trims comment', () => {
    expect(createPaymentSchema.parse(validPayment)).toEqual({
      studentId: '01929b3e-7c4a-7d2e-9f6b-1c2d3e4f5a6b',
      amount: 12000.5,
      lessonsCount: 8,
      paidOn: '2026-10-24',
      method: 'TRANSFER',
      comment: 'Оплата за ноябрь',
    });
  });

  it('accepts zero amount and empty comment', () => {
    const result = createPaymentSchema.parse({
      ...validPayment,
      amount: 0,
      comment: ' ',
    });

    expect(result.amount).toBe(0);
    expect(result.comment).toBeUndefined();
  });

  it.each([
    ['negative amount', { amount: -1 }],
    ['amount with 3 fraction digits', { amount: 1.005 }],
    ['zero lessons', { lessonsCount: 0 }],
    ['fractional lessons', { lessonsCount: 1.5 }],
    ['invalid date', { paidOn: '24.10.2026' }],
    ['unknown method', { method: 'CRYPTO' }],
    ['invalid student id', { studentId: '42' }],
    ['unknown field', { currency: 'USD' }],
  ])('rejects %s', (_, override) => {
    expect(
      createPaymentSchema.safeParse({ ...validPayment, ...override }).success,
    ).toBe(false);
  });
});

describe('updatePaymentSchema', () => {
  it('accepts partial update and keeps empty comment to clear it', () => {
    expect(
      updatePaymentSchema.parse({ lessonsCount: '10', comment: ' ' }),
    ).toEqual({ lessonsCount: 10, comment: '' });
  });

  it('rejects studentId change', () => {
    expect(
      updatePaymentSchema.safeParse({ studentId: validPayment.studentId })
        .success,
    ).toBe(false);
  });
});

describe('listPaymentsQuerySchema', () => {
  it('applies defaults', () => {
    expect(listPaymentsQuerySchema.parse({})).toEqual({ limit: 20, offset: 0 });
  });

  it('rejects inverted period', () => {
    expect(
      listPaymentsQuerySchema.safeParse({
        from: '2026-11-01',
        to: '2026-10-01',
      }).success,
    ).toBe(false);
  });
});
