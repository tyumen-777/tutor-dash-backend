import { ConflictException } from '@nestjs/common';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Prisma } from '../../generated/prisma/client.js';
import {
  PaymentStatus,
  SubscriptionStatus,
  SubscriptionUsageType,
} from '../../generated/prisma/enums.js';
import type { PrismaService } from '../../infra/prisma/prisma.service.js';
import { PaymentsService } from './payments.service.js';

const session = {
  user: { id: 'user-1' },
  session: { activeOrganizationId: 'org-1' },
};

const payment = {
  id: 'pay-1',
  amount: new Prisma.Decimal(8000),
  currency: 'RUB',
  method: 'CASH',
  status: PaymentStatus.COMPLETED,
  paidAt: new Date('2026-11-10T12:00:00.000Z'),
  comment: null,
  createdAt: new Date('2026-11-10T10:00:00.000Z'),
  student: { id: 'st-1', firstName: 'Аня', lastName: null },
  subscription: {
    id: 'sub-1',
    lessonsTotal: 8,
    lessonsLeft: 8,
    status: SubscriptionStatus.ACTIVE,
  },
  createdBy: { id: 'user-1', name: 'Admin' },
};

function setup(options: {
  paymentUpdated?: number;
  packageUpdated?: number;
  fresh?: { lessonsTotal: number; lessonsLeft: number };
}) {
  const tx = {
    payment: {
      updateMany: vi
        .fn()
        .mockResolvedValue({ count: options.paymentUpdated ?? 1 }),
      findUniqueOrThrow: vi.fn().mockResolvedValue(payment),
    },
    studentSubscription: {
      findUniqueOrThrow: vi.fn().mockResolvedValue({
        studentId: 'st-1',
        ...(options.fresh ?? { lessonsTotal: 8, lessonsLeft: 8 }),
      }),
      // Первый вызов — основное условное обновление, остальные — статусы
      updateMany: vi
        .fn()
        .mockResolvedValueOnce({ count: options.packageUpdated ?? 1 })
        .mockResolvedValue({ count: 1 }),
      update: vi.fn().mockResolvedValue({}),
    },
    subscriptionUsage: { create: vi.fn().mockResolvedValue({}) },
    financeLog: { create: vi.fn().mockResolvedValue({}) },
  };
  const prisma = {
    payment: { findFirst: vi.fn().mockResolvedValue(payment) },
    organization: {
      findUniqueOrThrow: vi
        .fn()
        .mockResolvedValue({ timezone: 'Europe/Moscow' }),
    },
    $transaction: vi.fn((fn: (client: typeof tx) => unknown) => fn(tx)),
  };
  const service = new PaymentsService(prisma as unknown as PrismaService);

  return { service, tx, prisma };
}

describe('PaymentsService.updatePayment', () => {
  it('changes the package by delta and logs an adjustment', async () => {
    const { service, tx } = setup({
      fresh: { lessonsTotal: 8, lessonsLeft: 5 },
    });

    await service.updatePayment(session, 'pay-1', { lessonsCount: 10 });

    expect(tx.studentSubscription.updateMany).toHaveBeenNthCalledWith(1, {
      where: {
        id: 'sub-1',
        status: { not: SubscriptionStatus.CANCELED },
        lessonsTotal: 8,
        lessonsLeft: { gte: -2 },
      },
      data: {
        name: 'Пакет: 10 зан.',
        lessonsTotal: 10,
        lessonsLeft: { increment: 2 },
      },
    });
    expect(tx.subscriptionUsage.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        subscriptionId: 'sub-1',
        studentId: 'st-1',
        type: SubscriptionUsageType.ADJUSTMENT,
        lessonsDelta: 2,
        createdByUserId: 'user-1',
      }),
    });
  });

  it('rejects shrinking below used lessons, using fresh data', async () => {
    const { service, tx } = setup({
      packageUpdated: 0,
      fresh: { lessonsTotal: 8, lessonsLeft: 2 },
    });

    await expect(
      service.updatePayment(session, 'pay-1', { lessonsCount: 4 }),
    ).rejects.toThrow('Package already has 6 used lessons');
    expect(tx.subscriptionUsage.create).not.toHaveBeenCalled();
  });

  it('does not touch the package when the payment was canceled concurrently', async () => {
    const { service, tx } = setup({ paymentUpdated: 0 });

    await expect(
      service.updatePayment(session, 'pay-1', { lessonsCount: 10 }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(tx.payment.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 'pay-1',
          organizationId: 'org-1',
          status: PaymentStatus.COMPLETED,
        },
      }),
    );
    expect(tx.studentSubscription.updateMany).not.toHaveBeenCalled();
  });

  it('skips the journal when the lessons count is unchanged', async () => {
    const { service, tx } = setup({});

    await service.updatePayment(session, 'pay-1', { lessonsCount: 8 });

    expect(tx.studentSubscription.updateMany).not.toHaveBeenCalled();
    expect(tx.subscriptionUsage.create).not.toHaveBeenCalled();
  });
});

describe('PaymentsService finance log', () => {
  it('logs an edit with the changed fields', async () => {
    const { service, tx } = setup({});
    tx.payment.findUniqueOrThrow.mockResolvedValueOnce({
      ...payment,
      amount: new Prisma.Decimal(10000),
    });

    await service.updatePayment(session, 'pay-1', { amount: 10000 });

    expect(tx.financeLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: 'org-1',
        entityType: 'PAYMENT',
        entityId: 'pay-1',
        studentId: 'st-1',
        action: 'UPDATED',
        actorUserId: 'user-1',
        changes: { amount: { from: '8000.00', to: '10000.00' } },
      }),
    });
  });

  it('does not log an edit that changed nothing', async () => {
    const { service, tx } = setup({});

    await service.updatePayment(session, 'pay-1', { method: 'CASH' });

    expect(tx.financeLog.create).not.toHaveBeenCalled();
  });

  it('logs a cancellation', async () => {
    const { service, tx } = setup({});

    await service.cancelPayment(session, 'pay-1');

    expect(tx.financeLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: 'CANCELED', entityId: 'pay-1' }),
    });
  });

  it('does not log a failed cancellation', async () => {
    const { service, tx } = setup({ packageUpdated: 0 });

    await expect(service.cancelPayment(session, 'pay-1')).rejects.toThrow();
    expect(tx.financeLog.create).not.toHaveBeenCalled();
  });
});

describe('PaymentsService.cancelPayment', () => {
  it('cancels only an untouched package and logs the reversal', async () => {
    const { service, tx } = setup({});

    await service.cancelPayment(session, 'pay-1');

    expect(tx.studentSubscription.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'sub-1',
        status: { not: SubscriptionStatus.CANCELED },
        lessonsLeft: 8,
      },
      data: { status: SubscriptionStatus.CANCELED, lessonsLeft: 0 },
    });
    expect(tx.subscriptionUsage.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ lessonsDelta: -8 }),
    });
  });

  it('fails when a lesson was deducted after the pre-check', async () => {
    const { service, tx } = setup({ packageUpdated: 0 });

    await expect(service.cancelPayment(session, 'pay-1')).rejects.toThrow(
      'already been used',
    );
    expect(tx.subscriptionUsage.create).not.toHaveBeenCalled();
  });
});

describe('PaymentsService closed months', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  // Оплата в тестовых данных — от 10.11.2026
  function at(now: string) {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(now));
  }

  it('moves the date within the current month', async () => {
    at('2026-11-24T09:00:00.000Z');
    const { service, prisma } = setup({});

    await service.updatePayment(session, 'pay-1', { paidOn: '2026-11-20' });

    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it('rejects moving the date into a previous month', async () => {
    at('2026-11-24T09:00:00.000Z');
    const { service, prisma } = setup({});

    await expect(
      service.updatePayment(session, 'pay-1', { paidOn: '2026-10-31' }),
    ).rejects.toThrow('closed month');
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejects moving a payment out of a closed month', async () => {
    at('2026-12-05T09:00:00.000Z');
    const { service } = setup({});

    await expect(
      service.updatePayment(session, 'pay-1', { paidOn: '2026-12-01' }),
    ).rejects.toBeInstanceOf(ConflictException);
    await expect(
      service.updatePayment(session, 'pay-1', { paidOn: '2026-11-12' }),
    ).rejects.toThrow('closed month');
  });

  it('allows other edits of a closed-month payment when the date is unchanged', async () => {
    at('2026-12-05T09:00:00.000Z');
    const { service, prisma } = setup({});

    await service.updatePayment(session, 'pay-1', {
      paidOn: '2026-11-10',
      comment: 'уточнение',
    });

    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it('closes the month by the school calendar, not UTC', async () => {
    // 30.11 22:00 UTC — уже 1 декабря в Москве
    at('2026-11-30T22:00:00.000Z');
    const { service } = setup({});

    await expect(
      service.updatePayment(session, 'pay-1', { paidOn: '2026-11-11' }),
    ).rejects.toThrow('closed month');
  });
});
