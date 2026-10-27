import { describe, expect, it } from 'vitest';

import { createExpenseSchema } from './create-expense.dto.js';
import { listExpensesQuerySchema } from './list-expenses-query.dto.js';
import { updateExpenseSchema } from './update-expense.dto.js';

const validExpense = {
  spentOn: '2026-10-01',
  amount: '85000.50',
  category: 'RENT',
  recipient: ' ООО «БизнесЦентр Плюс» ',
  method: 'TRANSFER',
  description: 'Аренда помещения за октябрь',
  comment: ' ',
};

describe('createExpenseSchema', () => {
  it('coerces amount, trims text and defaults status to PAID', () => {
    expect(createExpenseSchema.parse(validExpense)).toEqual({
      spentOn: '2026-10-01',
      amount: 85000.5,
      category: 'RENT',
      recipient: 'ООО «БизнесЦентр Плюс»',
      method: 'TRANSFER',
      status: 'PAID',
      description: 'Аренда помещения за октябрь',
    });
  });

  it('accepts teacher for salary', () => {
    const teacherId = '01929b3e-7c4a-7d2e-9f6b-1c2d3e4f5a6b';

    expect(
      createExpenseSchema.parse({
        ...validExpense,
        category: 'SALARY',
        teacherId,
      }).teacherId,
    ).toBe(teacherId);
  });

  it.each([
    ['zero amount', { amount: 0 }],
    ['amount with 3 fraction digits', { amount: 1.005 }],
    ['invalid date', { spentOn: '01.10.2026' }],
    ['unknown category', { category: 'FOOD' }],
    ['canceled status', { status: 'CANCELED' }],
    ['short recipient', { recipient: 'A' }],
    ['short description', { description: 'Ок' }],
    [
      'teacher for non-salary',
      { teacherId: '01929b3e-7c4a-7d2e-9f6b-1c2d3e4f5a6b' },
    ],
    ['unknown field', { currency: 'USD' }],
  ])('rejects %s', (_, override) => {
    expect(
      createExpenseSchema.safeParse({ ...validExpense, ...override }).success,
    ).toBe(false);
  });
});

describe('updateExpenseSchema', () => {
  it('keeps empty comment to clear it and null teacher to unlink', () => {
    expect(
      updateExpenseSchema.parse({ comment: ' ', teacherId: null }),
    ).toEqual({ comment: '', teacherId: null });
  });

  it('rejects canceled status', () => {
    expect(updateExpenseSchema.safeParse({ status: 'CANCELED' }).success).toBe(
      false,
    );
  });
});

describe('listExpensesQuerySchema', () => {
  it('applies defaults', () => {
    expect(listExpensesQuerySchema.parse({})).toEqual({ limit: 20, offset: 0 });
  });

  it('splits comma-separated categories', () => {
    expect(
      listExpensesQuerySchema.parse({ category: 'RENT,SALARY' }).category,
    ).toEqual(['RENT', 'SALARY']);
  });

  it.each([
    ['unknown category', { category: 'RENT,FOOD' }],
    ['inverted period', { from: '2026-11-01', to: '2026-10-01' }],
  ])('rejects %s', (_, query) => {
    expect(listExpensesQuerySchema.safeParse(query).success).toBe(false);
  });
});
