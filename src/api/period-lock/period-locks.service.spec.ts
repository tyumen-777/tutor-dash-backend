import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  FinanceLogAction,
  FinanceLogEntity,
} from '../../generated/prisma/enums.js';
import type { PrismaService } from '../../infra/prisma/prisma.service.js';
import { PeriodLocksService } from './period-locks.service.js';

const session = {
  user: { id: 'user-1' },
  session: { activeOrganizationId: 'org-1' },
};

function setup(existing: { id: string } | null = null) {
  const tx = {
    $queryRaw: vi.fn().mockResolvedValue([{ timezone: 'Europe/Moscow' }]),
    periodLock: {
      findUnique: vi.fn().mockResolvedValue(existing),
      create: vi.fn().mockResolvedValue({
        id: 'lock-1',
        month: new Date('2026-10-01T00:00:00.000Z'),
        createdAt: new Date('2026-11-24T09:00:00.000Z'),
        closedBy: { id: 'user-1', name: 'Owner' },
      }),
      delete: vi.fn().mockResolvedValue({}),
    },
    financeLog: { create: vi.fn().mockResolvedValue({}) },
  };
  const prisma = {
    $transaction: vi.fn((fn: (client: typeof tx) => unknown) => fn(tx)),
  };
  const service = new PeriodLocksService(prisma as unknown as PrismaService);

  return { service, tx };
}

describe('PeriodLocksService', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    // 30.11 22:00 UTC — уже 1 декабря в Москве
    vi.setSystemTime(new Date('2026-11-30T22:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('closes an ended month and logs it', async () => {
    const { service, tx } = setup();

    await expect(service.closePeriod(session, '2026-10')).resolves.toEqual({
      month: '2026-10',
      closedAt: '2026-11-24T09:00:00.000Z',
      closedBy: { id: 'user-1', name: 'Owner' },
    });
    expect(tx.financeLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        entityType: FinanceLogEntity.PERIOD,
        action: FinanceLogAction.CREATED,
        description: 'Закрыт месяц: октябрь 2026',
      }),
    });
  });

  it('closes the previous month by the school calendar', async () => {
    const { service, tx } = setup();

    await service.closePeriod(session, '2026-11');

    expect(tx.periodLock.create).toHaveBeenCalled();
  });

  it('rejects the current and future months', async () => {
    const { service, tx } = setup();

    await expect(service.closePeriod(session, '2026-12')).rejects.toThrow(
      'already ended',
    );
    await expect(service.closePeriod(session, '2027-01')).rejects.toThrow(
      'already ended',
    );
    expect(tx.periodLock.create).not.toHaveBeenCalled();
  });

  it('rejects closing twice', async () => {
    const { service } = setup({ id: 'lock-1' });

    await expect(service.closePeriod(session, '2026-10')).rejects.toThrow(
      'already closed',
    );
  });

  it('reopens a closed month and logs it', async () => {
    const { service, tx } = setup({ id: 'lock-1' });

    await service.reopenPeriod(session, '2026-10');

    expect(tx.periodLock.delete).toHaveBeenCalledWith({
      where: { id: 'lock-1' },
    });
    expect(tx.financeLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        entityId: 'lock-1',
        action: FinanceLogAction.CANCELED,
      }),
    });
  });

  it('fails to reopen a month that is not closed', async () => {
    const { service } = setup(null);

    await expect(service.reopenPeriod(session, '2026-10')).rejects.toThrow(
      'not closed',
    );
  });
});
