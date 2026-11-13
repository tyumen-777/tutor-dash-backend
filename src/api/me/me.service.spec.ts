import { NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import { Prisma } from '../../generated/prisma/client.js';
import type { PrismaService } from '../../infra/prisma/prisma.service.js';
import type { PayoutsService } from '../payout/payouts.service.js';
import type { TeachersService } from '../teacher/teachers.service.js';
import { MeService } from './me.service.js';

const session = {
  user: { id: 'user-1' },
  session: { activeOrganizationId: 'org-1' },
};
const period = { from: '2026-11-01', to: '2026-11-30' };

function setup(teacher: { id: string } | null, rows: unknown[] = []) {
  const prisma = {
    teacher: { findFirst: vi.fn().mockResolvedValue(teacher) },
    expense: {
      findMany: vi.fn().mockResolvedValue([
        {
          id: 'payout-1',
          spentOn: new Date('2026-11-15T00:00:00.000Z'),
          amount: new Prisma.Decimal(2400),
          _count: { payoutLessons: 2 },
        },
      ]),
    },
  };
  const payouts = {
    getReport: vi.fn().mockResolvedValue({
      currency: 'RUB',
      period,
      totals: {},
      teachers: rows,
    }),
  };
  const teachers = { getTeacher: vi.fn() };
  const service = new MeService(
    prisma as unknown as PrismaService,
    teachers as unknown as TeachersService,
    payouts as unknown as PayoutsService,
  );

  return { service, prisma, payouts };
}

describe('MeService', () => {
  it('returns 404 when no teacher profile is linked', async () => {
    const { service } = setup(null);

    await expect(service.getEarnings(session, period)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('looks up the profile by the current user in the active school', async () => {
    const { service, prisma } = setup({ id: 't-1' });

    await service.getEarnings(session, period);

    expect(prisma.teacher.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          organizationId: 'org-1',
          member: { userId: 'user-1', organizationId: 'org-1' },
        },
      }),
    );
  });

  it('builds the report only for own teacher and own payouts', async () => {
    const { service, prisma, payouts } = setup({ id: 't-1' }, [
      {
        id: 't-1',
        lessonsCount: 3,
        unpaidLessonsCount: 1,
        accrued: '3600.00',
        paid: '2400.00',
        due: '1200.00',
        dueBefore: '0.00',
      },
    ]);

    const earnings = await service.getEarnings(session, period);

    expect(payouts.getReport).toHaveBeenCalledWith(session, {
      ...period,
      teacherId: 't-1',
    });
    expect(prisma.expense.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ teacherId: 't-1' }),
      }),
    );
    expect(earnings).toMatchObject({
      lessonsCount: 3,
      accrued: '3600.00',
      due: '1200.00',
      payouts: [
        {
          id: 'payout-1',
          paidOn: '2026-11-15',
          amount: '2400.00',
          lessonsCount: 2,
        },
      ],
    });
  });

  it('returns zeros for a month without lessons', async () => {
    const { service } = setup({ id: 't-1' });

    await expect(service.getEarnings(session, period)).resolves.toMatchObject({
      lessonsCount: 0,
      accrued: '0.00',
      paid: '0.00',
      due: '0.00',
      dueBefore: '0.00',
    });
  });
});
