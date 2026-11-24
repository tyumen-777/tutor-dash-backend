import { BadRequestException, Injectable } from '@nestjs/common';

import type { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../infra/prisma/prisma.service.js';
import { addDays, startOfSchoolDay } from '../dashboard/school-date.js';
import type { FinanceLogListResponseDto } from './dto/finance-log-response.dto.js';
import type { ListFinanceLogsQueryDto } from './dto/list-finance-logs-query.dto.js';

type OrganizationSession = {
  user: { id: string };
  session: { activeOrganizationId?: string | null };
};

const financeLogInclude = {
  actor: { select: { id: true, name: true } },
  student: { select: { id: true, firstName: true, lastName: true } },
} satisfies Prisma.FinanceLogInclude;

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
      })),
      total,
      limit: query.limit,
      offset: query.offset,
    };
  }
}
