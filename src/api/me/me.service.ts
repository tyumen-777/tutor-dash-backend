import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  ExpenseCategory,
  ExpenseStatus,
} from '../../generated/prisma/enums.js';
import { PrismaService } from '../../infra/prisma/prisma.service.js';
import { PayoutsService } from '../payout/payouts.service.js';
import type { TeacherResponseDto } from '../teacher/dto/teacher-response.dto.js';
import { TeachersService } from '../teacher/teachers.service.js';
import type {
  MyEarningsQueryDto,
  MyEarningsResponseDto,
} from './dto/my-earnings.dto.js';

type OrganizationSession = {
  user: { id: string };
  session: { activeOrganizationId?: string | null };
};

@Injectable()
export class MeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly teachersService: TeachersService,
    private readonly payoutsService: PayoutsService,
  ) {}

  async getTeacher(session: OrganizationSession): Promise<TeacherResponseDto> {
    const teacherId = await this.getTeacherId(session);

    return this.teachersService.getTeacher(session, teacherId);
  }

  async getEarnings(
    session: OrganizationSession,
    query: MyEarningsQueryDto,
  ): Promise<MyEarningsResponseDto> {
    const teacherId = await this.getTeacherId(session);
    const organizationId = this.getOrganizationId(session);
    // Тот же расчёт, что в отчёте о выплатах, но только по своей карточке
    const [report, payouts] = await Promise.all([
      this.payoutsService.getReport(session, { ...query, teacherId }),
      this.prisma.expense.findMany({
        where: {
          organizationId,
          teacherId,
          category: ExpenseCategory.SALARY,
          status: { not: ExpenseStatus.CANCELED },
          spentOn: {
            gte: new Date(`${query.from}T00:00:00.000Z`),
            lte: new Date(`${query.to}T00:00:00.000Z`),
          },
        },
        orderBy: [{ spentOn: 'desc' }, { createdAt: 'desc' }],
        select: {
          id: true,
          spentOn: true,
          amount: true,
          _count: { select: { payoutLessons: true } },
        },
      }),
    ]);
    const row = report.teachers.find((teacher) => teacher.id === teacherId);

    return {
      currency: report.currency,
      period: report.period,
      lessonsCount: row?.lessonsCount ?? 0,
      unpaidLessonsCount: row?.unpaidLessonsCount ?? 0,
      accrued: row?.accrued ?? '0.00',
      paid: row?.paid ?? '0.00',
      due: row?.due ?? '0.00',
      dueBefore: row?.dueBefore ?? '0.00',
      payouts: payouts.map((payout) => ({
        id: payout.id,
        paidOn: payout.spentOn.toISOString().slice(0, 10),
        amount: payout.amount.toFixed(2),
        lessonsCount: payout._count.payoutLessons,
      })),
    };
  }

  // Карточка преподавателя, привязанная к текущему пользователю в этой школе
  private async getTeacherId(session: OrganizationSession): Promise<string> {
    const organizationId = this.getOrganizationId(session);
    const teacher = await this.prisma.teacher.findFirst({
      where: {
        organizationId,
        member: { userId: session.user.id, organizationId },
      },
      select: { id: true },
    });

    if (!teacher) {
      throw new NotFoundException('Teacher profile is not linked');
    }

    return teacher.id;
  }

  private getOrganizationId(session: OrganizationSession): string {
    const organizationId = session.session.activeOrganizationId;

    if (!organizationId) {
      throw new BadRequestException('Active organization is required');
    }

    return organizationId;
  }
}
