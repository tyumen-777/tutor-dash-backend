import { describe, expect, it } from 'vitest';

import { Prisma } from '../../generated/prisma/client.js';
import { buildFinance } from './finance.js';

const d = (value: number | string) => new Prisma.Decimal(value);

describe('buildFinance', () => {
  it('counts profit by held lessons, not by money received', () => {
    // Пакет 8 занятий за 12 000 ₽ оплачен в этом месяце, проведено 2
    expect(
      buildFinance({
        income: d(12000),
        paidExpenses: d(5000),
        revenue: d(3000),
        teacherPay: d(1600),
        otherExpenses: d(1000),
        prepaid: d(9000),
        teacherDebt: d(1600),
      }),
    ).toEqual({
      revenue: '3000.00',
      teacherPay: '1600.00',
      otherExpenses: '1000.00',
      profit: '400.00',
      cashFlow: '7000.00',
      prepaid: '9000.00',
      teacherDebt: '1600.00',
    });
  });

  it('keeps cents and allows a loss', () => {
    expect(
      buildFinance({
        income: d(0),
        paidExpenses: d('30000.50'),
        revenue: d('1666.67'),
        teacherPay: d(1000),
        otherExpenses: d(30000),
        prepaid: d(0),
        teacherDebt: d(0),
      }),
    ).toMatchObject({ profit: '-29333.33', cashFlow: '-30000.50' });
  });
});
