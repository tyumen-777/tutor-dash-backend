import { describe, expect, it } from 'vitest';

import { Prisma } from '../../generated/prisma/client.js';
import { calculateTeacherPay } from './lesson-pay.js';

describe('calculateTeacherPay', () => {
  it.each([
    ['1000', '1000.00'],
    ['1055.50', '1055.50'],
  ])('pays the full hourly rate %s for 60 minutes', (rate, expected) => {
    expect(calculateTeacherPay(new Prisma.Decimal(rate), 60).toFixed(2)).toBe(
      expected,
    );
  });

  it.each([
    ['1000', '750.00'],
    ['1050', '790.00'],
    ['1111', '840.00'],
    ['1200', '900.00'],
    ['0', '0.00'],
  ])('rounds 45 minutes of %s up to 10', (rate, expected) => {
    expect(calculateTeacherPay(new Prisma.Decimal(rate), 45).toFixed(2)).toBe(
      expected,
    );
  });
});
