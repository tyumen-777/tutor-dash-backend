import { ForbiddenException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import { FinanceLogEntity } from '../../generated/prisma/enums.js';
import type { PrismaService } from '../../infra/prisma/prisma.service.js';
import { FinanceLogsService } from './finance-logs.service.js';

const session = {
  user: { id: 'user-1' },
  session: { activeOrganizationId: 'org-1' },
};

function setup(role: string) {
  const prisma = {
    member: { findUnique: vi.fn().mockResolvedValue({ role }) },
    financeLog: {
      findMany: vi.fn().mockReturnValue([]),
      count: vi.fn().mockReturnValue(0),
    },
    $transaction: vi.fn((queries: unknown[]) => Promise.all(queries)),
  };
  const service = new FinanceLogsService(prisma as unknown as PrismaService);

  return { service, prisma };
}

const query = { limit: 50, offset: 0 };

describe('FinanceLogsService.listLogs', () => {
  it('shows a manager only student payments', async () => {
    const { service, prisma } = setup('manager');

    await service.listLogs(session, query);

    expect(prisma.financeLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          entityType: FinanceLogEntity.PAYMENT,
        }),
      }),
    );
  });

  it('refuses payouts to a manager', async () => {
    const { service } = setup('manager');

    await expect(
      service.listLogs(session, {
        ...query,
        entityType: FinanceLogEntity.PAYOUT,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it.each(['owner', 'admin', 'accountant', 'manager,accountant'])(
    'shows %s all operations',
    async (role) => {
      const { service, prisma } = setup(role);

      await service.listLogs(session, query);

      const [{ where }] = prisma.financeLog.findMany.mock.calls[0] as [
        { where: Record<string, unknown> },
      ];
      expect(where.entityType).toBeUndefined();
    },
  );
});
