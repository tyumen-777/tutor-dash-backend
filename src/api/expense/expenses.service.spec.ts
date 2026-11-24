import { describe, expect, it, vi } from 'vitest';

import { Prisma } from '../../generated/prisma/client.js';
import {
  ExpenseCategory,
  ExpenseStatus,
  FinanceLogAction,
  FinanceLogEntity,
} from '../../generated/prisma/enums.js';
import type { PrismaService } from '../../infra/prisma/prisma.service.js';
import { ExpensesService } from './expenses.service.js';

const session = {
  user: { id: 'user-1' },
  session: { activeOrganizationId: 'org-1' },
};

// Старый ручной расход «зарплата», привязанный к преподавателю мимо выплат
const legacySalary = {
  id: 'exp-1',
  spentOn: new Date('2026-11-10T00:00:00.000Z'),
  amount: new Prisma.Decimal(5000),
  currency: 'RUB',
  category: ExpenseCategory.SALARY,
  recipient: null,
  method: 'CASH',
  status: ExpenseStatus.PAID,
  description: 'Зарплата',
  comment: null,
  teacher: { id: 't-1', fullName: 'Анна' },
  createdBy: { id: 'user-1', name: 'Admin' },
  createdAt: new Date('2026-11-10T10:00:00.000Z'),
  _count: { payoutLessons: 0 },
};

function setup(
  options: { unlinkedLessons?: number; closedMonth?: string } = {},
) {
  const tx = {
    $queryRaw: vi.fn().mockResolvedValue([{ timezone: 'Europe/Moscow' }]),
    periodLock: {
      findFirst: vi
        .fn()
        .mockResolvedValue(
          options.closedMonth
            ? { month: new Date(`${options.closedMonth}-01T00:00:00.000Z`) }
            : null,
        ),
    },
    expense: {
      create: vi.fn().mockResolvedValue({ ...legacySalary, teacher: null }),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    lesson: {
      updateMany: vi
        .fn()
        .mockResolvedValue({ count: options.unlinkedLessons ?? 0 }),
    },
    financeLog: { create: vi.fn().mockResolvedValue({}) },
  };
  const prisma = {
    $transaction: vi.fn((fn: (client: typeof tx) => unknown) => fn(tx)),
    organization: {
      findUniqueOrThrow: vi
        .fn()
        .mockResolvedValue({ currency: 'RUB', timezone: 'Europe/Moscow' }),
    },
    expense: {
      findFirst: vi.fn().mockResolvedValue(legacySalary),
    },
  };
  const service = new ExpensesService(prisma as unknown as PrismaService);

  return { service, prisma, tx };
}

describe('ExpensesService', () => {
  it('creates salary expenses without a teacher', async () => {
    const { service, tx } = setup();

    await service.createExpense(session, {
      spentOn: '2026-11-10',
      amount: 5000,
      category: ExpenseCategory.SALARY,
      method: 'CASH',
      status: 'PAID',
      description: 'Зарплата администратора',
    });

    expect(tx.expense.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ teacherId: null }),
      }),
    );
  });

  it('keeps the teacher of a legacy salary on unrelated edits', async () => {
    const { service, tx } = setup();

    await service.updateExpense(session, 'exp-1', { comment: 'Аванс' });

    expect(tx.expense.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ teacherId: 't-1' }),
      }),
    );
  });

  it.each([
    ['explicit unlink', { teacherId: null }],
    ['category change', { category: ExpenseCategory.OTHER }],
  ])('unlinks the teacher on %s', async (_, dto) => {
    const { service, tx } = setup();

    await service.updateExpense(session, 'exp-1', dto);

    expect(tx.expense.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ teacherId: null }),
      }),
    );
  });

  it('logs canceling a payout with the lessons it released', async () => {
    const { service, tx } = setup({ unlinkedLessons: 3 });

    await service.cancelExpense(session, 'exp-1');

    expect(tx.financeLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        entityType: FinanceLogEntity.PAYOUT,
        entityId: 'exp-1',
        teacherId: 't-1',
        action: FinanceLogAction.CANCELED,
        description:
          'Отменена выплата преподавателю Анна от 10.11.2026: 5 000 ₽ · 3 зан. снова к выплате',
      }),
    });
  });

  it('does not log canceling an ordinary expense', async () => {
    const { service, tx } = setup({ unlinkedLessons: 0 });

    await service.cancelExpense(session, 'exp-1');

    expect(tx.financeLog.create).not.toHaveBeenCalled();
  });

  describe('in a closed month', () => {
    it('rejects a new expense', async () => {
      const { service, tx } = setup({ closedMonth: '2026-11' });

      await expect(
        service.createExpense(session, {
          spentOn: '2026-11-10',
          amount: 5000,
          category: ExpenseCategory.RENT,
          method: 'CASH',
          status: 'PAID',
          description: 'Аренда',
        }),
      ).rejects.toThrow('Period 2026-11 is closed');
      expect(tx.expense.create).not.toHaveBeenCalled();
    });

    it('rejects changing the amount', async () => {
      const { service, tx } = setup({ closedMonth: '2026-11' });

      await expect(
        service.updateExpense(session, 'exp-1', { amount: 6000 }),
      ).rejects.toThrow('is closed');
      expect(tx.expense.updateMany).not.toHaveBeenCalled();
    });

    it('allows editing the comment and the unchanged fields', async () => {
      const { service, tx } = setup({ closedMonth: '2026-11' });

      await service.updateExpense(session, 'exp-1', {
        spentOn: '2026-11-10',
        amount: 5000,
        comment: 'уточнение',
      });

      expect(tx.periodLock.findFirst).not.toHaveBeenCalled();
      expect(tx.expense.updateMany).toHaveBeenCalled();
    });

    it('rejects canceling', async () => {
      const { service, tx } = setup({ closedMonth: '2026-11' });

      await expect(service.cancelExpense(session, 'exp-1')).rejects.toThrow(
        'is closed',
      );
      expect(tx.expense.updateMany).not.toHaveBeenCalled();
    });
  });
});
