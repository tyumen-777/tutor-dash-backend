import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

import type { Prisma } from '../../generated/prisma/client.js';
import { FinanceLogEntity } from '../../generated/prisma/enums.js';
import { PrismaService } from '../../infra/prisma/prisma.service.js';
import { addDays, startOfSchoolDay } from '../dashboard/school-date.js';
import { parseMemberRoles } from '../teacher/teacher-access.js';
import type { FinanceLogListResponseDto } from './dto/finance-log-response.dto.js';
import type { ListFinanceLogsQueryDto } from './dto/list-finance-logs-query.dto.js';

type OrganizationSession = {
  user: { id: string };
  session: { activeOrganizationId?: string | null };
};

const financeLogInclude = {
  actor: { select: { id: true, name: true } },
  student: { select: { id: true, firstName: true, lastName: true } },
  teacher: { select: { id: true, fullName: true } },
} satisfies Prisma.FinanceLogInclude;

// Совпадает с доступом к GET /expenses и /payouts: зарплаты видны не всем
const PAYOUT_ROLES = ['owner', 'admin', 'accountant'];

@Injectable()
export class FinanceLogsService {
  constructor(private readonly prisma: PrismaService) {}

  async listLogs(
    session: OrganizationSession,
    query: ListFinanceLogsQueryDto,
  ): Promise<FinanceLogListResponseDto> {
    const organizationId = session.session.activeOrganizationId;

    if (!organizationId) {
      throw new BadRequestException('Active organization is required');
    }

    const where: Prisma.FinanceLogWhereInput = { organizationId };

    if (query.from || query.to) {
      const { timezone } = await this.prisma.organization.findUniqueOrThrow({
        where: { id: organizationId },
        select: { timezone: true },
      });

      // Границы — сутки по календарю школы, а не UTC
      where.createdAt = {
        gte: query.from ? startOfSchoolDay(query.from, timezone) : undefined,
        lt: query.to
          ? startOfSchoolDay(addDays(query.to, 1), timezone)
          : undefined,
      };
    }

    if (query.action) {
      where.action = query.action;
    }

    if (query.studentId) {
      where.studentId = query.studentId;
    }

    const canSeePayouts = await this.canSeePayouts(organizationId, session);

    // Выплаты и закрытие месяцев видны тем же ролям, что и расходы
    if (
      !canSeePayouts &&
      query.entityType &&
      query.entityType !== FinanceLogEntity.PAYMENT
    ) {
      throw new ForbiddenException('Insufficient organization role');
    }

    if (query.entityType) {
      where.entityType = query.entityType;
    } else if (!canSeePayouts) {
      where.entityType = FinanceLogEntity.PAYMENT;
    }

    const [logs, total] = await this.prisma.$transaction([
      this.prisma.financeLog.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: query.limit,
        skip: query.offset,
        include: financeLogInclude,
      }),
      this.prisma.financeLog.count({ where }),
    ]);

    return {
      items: logs.map((log) => ({
        id: log.id,
        createdAt: log.createdAt.toISOString(),
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        description: log.description,
        actor: log.actor,
        student: log.student,
        teacher: log.teacher,
      })),
      total,
      limit: query.limit,
      offset: query.offset,
    };
  }

  private async canSeePayouts(
    organizationId: string,
    session: OrganizationSession,
  ): Promise<boolean> {
    const member = await this.prisma.member.findUnique({
      where: {
        organizationId_userId: { organizationId, userId: session.user.id },
      },
      select: { role: true },
    });

    return parseMemberRoles(member?.role ?? '').some((role) =>
      PAYOUT_ROLES.includes(role),
    );
  }
}
