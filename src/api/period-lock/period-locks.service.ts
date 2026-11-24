import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma } from '../../generated/prisma/client.js';
import {
  FinanceLogAction,
  FinanceLogEntity,
} from '../../generated/prisma/enums.js';
import { PrismaService } from '../../infra/prisma/prisma.service.js';
import { schoolToday } from '../dashboard/school-date.js';
import {
  describePeriodClosed,
  describePeriodReopened,
} from '../finance-log/period-log.js';
import {
  lockOrganization,
  monthOf,
  monthToDate,
} from '../shared/period-lock.js';
import type {
  PeriodLockListResponseDto,
  PeriodLockResponseDto,
} from './dto/period-lock.dto.js';

type OrganizationSession = {
  user: { id: string };
  session: { activeOrganizationId?: string | null };
};

const periodLockInclude = {
  closedBy: { select: { id: true, name: true } },
} satisfies Prisma.PeriodLockInclude;

type PeriodLockWithRelations = Prisma.PeriodLockGetPayload<{
  include: typeof periodLockInclude;
}>;

@Injectable()
export class PeriodLocksService {
  constructor(private readonly prisma: PrismaService) {}

  async listLocks(
    session: OrganizationSession,
  ): Promise<PeriodLockListResponseDto> {
    const organizationId = this.getOrganizationId(session);
    const [organization, locks] = await Promise.all([
      this.prisma.organization.findUniqueOrThrow({
        where: { id: organizationId },
        select: { timezone: true },
      }),
      this.prisma.periodLock.findMany({
        where: { organizationId },
        orderBy: { month: 'desc' },
        include: periodLockInclude,
      }),
    ]);

    return {
      currentMonth: monthOf(schoolToday(organization.timezone)),
      items: locks.map((lock) => this.toResponse(lock)),
    };
  }

  async closePeriod(
    session: OrganizationSession,
    month: string,
  ): Promise<PeriodLockResponseDto> {
    const organizationId = this.getOrganizationId(session);

    const lock = await this.prisma.$transaction(async (tx) => {
      // Ждём, пока завершатся операции, которые уже проверили этот месяц
      const timezone = await lockOrganization(tx, organizationId, 'update');

      if (month >= monthOf(schoolToday(timezone))) {
        throw new BadRequestException(
          'Only months that have already ended can be closed',
        );
      }

      const existing = await tx.periodLock.findUnique({
        where: {
          organizationId_month: { organizationId, month: monthToDate(month) },
        },
        select: { id: true },
      });

      if (existing) {
        throw new ConflictException('Month is already closed');
      }

      const created = await tx.periodLock.create({
        data: {
          organizationId,
          month: monthToDate(month),
          closedByUserId: session.user.id,
        },
        include: periodLockInclude,
      });

      await tx.financeLog.create({
        data: {
          organizationId,
          entityType: FinanceLogEntity.PERIOD,
          entityId: created.id,
          action: FinanceLogAction.CREATED,
          description: describePeriodClosed(month),
          actorUserId: session.user.id,
        },
      });

      return created;
    });

    return this.toResponse(lock);
  }

  async reopenPeriod(
    session: OrganizationSession,
    month: string,
  ): Promise<void> {
    const organizationId = this.getOrganizationId(session);

    await this.prisma.$transaction(async (tx) => {
      await lockOrganization(tx, organizationId, 'update');

      const lock = await tx.periodLock.findUnique({
        where: {
          organizationId_month: { organizationId, month: monthToDate(month) },
        },
        select: { id: true },
      });

      if (!lock) {
        throw new NotFoundException('Month is not closed');
      }

      await tx.periodLock.delete({ where: { id: lock.id } });
      await tx.financeLog.create({
        data: {
          organizationId,
          entityType: FinanceLogEntity.PERIOD,
          entityId: lock.id,
          action: FinanceLogAction.CANCELED,
          description: describePeriodReopened(month),
          actorUserId: session.user.id,
        },
      });
    });
  }

  private toResponse(lock: PeriodLockWithRelations): PeriodLockResponseDto {
    return {
      month: lock.month.toISOString().slice(0, 7),
      closedAt: lock.createdAt.toISOString(),
      closedBy: lock.closedBy,
    };
  }

  private getOrganizationId(session: OrganizationSession): string {
    const organizationId = session.session.activeOrganizationId;

    if (!organizationId) {
      throw new BadRequestException('Active organization is required');
    }

    return organizationId;
  }
}
