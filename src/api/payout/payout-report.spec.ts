import { describe, expect, it } from 'vitest';

import { Prisma } from '../../generated/prisma/client.js';
import { buildPayoutRows } from './payout-report.js';

const decimal = (value: number) => new Prisma.Decimal(value);

const anna = { id: 'anna', fullName: 'Анна', isActive: true };
const boris = { id: 'boris', fullName: 'Борис', isActive: false };
const vera = { id: 'vera', fullName: 'Вера', isActive: true };

describe('buildPayoutRows', () => {
  it('splits accrued pay into paid and due', () => {
    const [row] = buildPayoutRows(
      [anna],
      [{ teacherId: 'anna', pay: decimal(6000), count: 3 }],
      [{ teacherId: 'anna', pay: decimal(2000), count: 1 }],
      [],
    );

    expect(row).toMatchObject({
      lessonsCount: 3,
      unpaidLessonsCount: 1,
      accrued: decimal(6000),
      paid: decimal(4000),
      due: decimal(2000),
      dueBefore: decimal(0),
    });
  });

  it('treats lessons without pay as zero', () => {
    const [row] = buildPayoutRows(
      [anna],
      [{ teacherId: 'anna', pay: null, count: 2 }],
      [{ teacherId: 'anna', pay: null, count: 2 }],
      [],
    );

    expect(row.accrued.toFixed(2)).toBe('0.00');
    expect(row.due.toFixed(2)).toBe('0.00');
    expect(row.lessonsCount).toBe(2);
  });

  it('keeps teachers with old debt only and drops idle ones', () => {
    const rows = buildPayoutRows(
      [anna, boris, vera],
      [{ teacherId: 'anna', pay: decimal(1000), count: 1 }],
      [],
      [{ teacherId: 'boris', pay: decimal(500), count: 1 }],
    );

    expect(rows.map((row) => row.id)).toEqual(['boris', 'anna']);
    expect(rows[0]).toMatchObject({ lessonsCount: 0, dueBefore: decimal(500) });
  });

  it('sorts by total debt, then by name', () => {
    const rows = buildPayoutRows(
      [vera, anna, boris],
      [
        { teacherId: 'anna', pay: decimal(1000), count: 1 },
        { teacherId: 'boris', pay: decimal(3000), count: 1 },
        { teacherId: 'vera', pay: decimal(1000), count: 1 },
      ],
      [
        { teacherId: 'anna', pay: decimal(1000), count: 1 },
        { teacherId: 'vera', pay: decimal(1000), count: 1 },
      ],
      [],
    );

    expect(rows.map((row) => row.id)).toEqual(['anna', 'vera', 'boris']);
  });
});
