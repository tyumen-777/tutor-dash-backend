import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';

import { Prisma } from '../../generated/prisma/client.js';
import {
  ExpenseCategory,
  ExpenseStatus,
  LessonStatus,
} from '../../generated/prisma/enums.js';
import { PrismaService } from '../../infra/prisma/prisma.service.js';
import {
  addDays,
  schoolToday,
  startOfSchoolDay,
} from '../dashboard/school-date.js';
import type { ExpenseResponseDto } from '../expense/dto/expense-response.dto.js';
import { ExpensesService } from '../expense/expenses.service.js';
import type { CreatePayoutDto } from './dto/create-payout.dto.js';
import type { PayoutReportQueryDto } from './dto/payout-report-query.dto.js';
import type { PayoutReportResponseDto } from './dto/payout-report-response.dto.js';
import { buildPayoutRows, type PayGroup } from './payout-report.js';

type OrganizationSession = {
  user: { id: string };
  session: { activeOrganizationId?: string | null };
};

@Injectable()
export class PayoutsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly expensesService: ExpensesService,
  ) {}

  async getReport(
    session: OrganizationSession,
    query: PayoutReportQueryDto,
  ): Promise<PayoutReportResponseDto> {
    const organizationId = this.getOrganizationId(session);
    const organization = await this.prisma.organization.findUniqueOrThrow({
      where: { id: organizationId },
      select: { currency: true, timezone: true },
    });
    const periodStart = startOfSchoolDay(query.from, organization.timezone);
    const held: Prisma.LessonWhereInput = {
      organizationId,
      status: LessonStatus.COMPLETED,
      teacherId: query.teacherId,
    };

    const [period, unpaid, unpaidBefore] = await Promise.all([
      this.sumPayByTeacher({
        ...held,
        startsAt: this.periodRange(query.from, query.to, organization.timezone),
      }),
      this.sumPayByTeacher({
        ...held,
        payoutExpenseId: null,
        startsAt: this.periodRange(query.from, query.to, organization.timezone),
      }),
      this.sumPayByTeacher({
        ...held,
        payoutExpenseId: null,
        startsAt: { lt: periodStart },
      }),
    ]);
    const teacherIds = [
      ...new Set([...period, ...unpaidBefore].map((group) => group.teacherId)),
    ];
    const teachers = await this.prisma.teacher.findMany({
      where: { organizationId, id: { in: teacherIds } },
      select: { id: true, fullName: true, isActive: true },
    });
    const rows = buildPayoutRows(teachers, period, unpaid, unpaidBefore);
    const total = (key: 'accrued' | 'paid' | 'due' | 'dueBefore') =>
      rows
        .reduce((sum, row) => sum.plus(row[key]), new Prisma.Decimal(0))
        .toFixed(2);

    return {
      currency: organization.currency,
      period: { from: query.from, to: query.to },
      totals: {
        accrued: total('accrued'),
        paid: total('paid'),
        due: total('due'),
        dueBefore: total('dueBefore'),
      },
      teachers: rows.map((row) => ({
        ...row,
        accrued: row.accrued.toFixed(2),
        paid: row.paid.toFixed(2),
        due: row.due.toFixed(2),
        dueBefore: row.dueBefore.toFixed(2),
      })),
    };
  }

  async createPayout(
    session: OrganizationSession,
    dto: CreatePayoutDto,
  ): Promise<ExpenseResponseDto> {
    const organizationId = this.getOrganizationId(session);
    const organization = await this.prisma.organization.findUniqueOrThrow({
      where: { id: organizationId },
      select: { currency: true, timezone: true },
    });

    if (dto.paidOn > schoolToday(organization.timezone)) {
      throw new BadRequestException('paidOn cannot be in the future');
    }

    const teacher = await this.prisma.teacher.findFirst({
      where: { id: dto.teacherId, organizationId },
      select: { id: true, fullName: true },
    });

    if (!teacher) {
      throw new BadRequestException('Teacher not found');
    }

    const unpaidLessons: Prisma.LessonWhereInput = {
      organizationId,
      teacherId: teacher.id,
      status: LessonStatus.COMPLETED,
      payoutExpenseId: null,
      startsAt: this.periodRange(dto.from, dto.to, organization.timezone),
    };

    const expenseId = await this.prisma.$transaction(async (tx) => {
      const due = await tx.lesson.aggregate({
        where: unpaidLessons,
        _sum: { teacherPay: true },
        _count: { _all: true },
      });

      if (due._count._all === 0) {
        throw new ConflictException('No unpaid lessons in this period');
      }

      const dueAmount = due._sum.teacherPay ?? new Prisma.Decimal(0);

      if (dueAmount.lte(0)) {
        throw new ConflictException('Unpaid lessons of this period cost 0');
      }

      const expense = await tx.expense.create({
        data: {
          organizationId,
          spentOn: new Date(`${dto.paidOn}T00:00:00.000Z`),
          amount: dueAmount,
          currency: organization.currency,
          category: ExpenseCategory.SALARY,
          recipient: teacher.fullName,
          method: dto.method,
          status: ExpenseStatus.PAID,
          description: `Выплата за занятия ${this.formatDate(dto.from)}–${this.formatDate(dto.to)}`,
          comment: dto.comment ?? null,
          teacherId: teacher.id,
          createdByUserId: session.user.id,
        },
        select: { id: true },
      });

      // Условие payoutExpenseId: null не даёт оплатить занятие дважды
      // при параллельных выплатах
      await tx.lesson.updateMany({
        where: unpaidLessons,
        data: { payoutExpenseId: expense.id },
      });

      // Между подсчётом и привязкой часть занятий могла уйти в другую
      // выплату, поэтому сумма пересчитывается по привязанным
      const { _sum } = await tx.lesson.aggregate({
        where: { payoutExpenseId: expense.id },
        _sum: { teacherPay: true },
      });
      const amount = _sum.teacherPay ?? new Prisma.Decimal(0);

      if (amount.lte(0)) {
        throw new ConflictException('No unpaid lessons in this period');
      }

      if (!amount.equals(dueAmount)) {
        await tx.expense.update({
          where: { id: expense.id },
          data: { amount },
        });
      }

      return expense.id;
    });

    return this.expensesService.getExpense(session, expenseId);
  }

  private async sumPayByTeacher(
    where: Prisma.LessonWhereInput,
  ): Promise<PayGroup[]> {
    const groups = await this.prisma.lesson.groupBy({
      by: ['teacherId'],
      where,
      _sum: { teacherPay: true },
      _count: { _all: true },
    });

    return groups.map((group) => ({
      teacherId: group.teacherId,
      pay: group._sum.teacherPay,
      count: group._count._all,
    }));
  }

  // Границы периода — сутки в часовом поясе школы, как в GET /lessons
  private periodRange(
    from: string,
    to: string,
    timezone: string,
  ): Prisma.DateTimeFilter {
    return {
      gte: startOfSchoolDay(from, timezone),
      lt: startOfSchoolDay(addDays(to, 1), timezone),
    };
  }

  private formatDate(date: string): string {
    const [year, month, day] = date.split('-');

    return `${day}.${month}.${year}`;
  }

  private getOrganizationId(session: OrganizationSession): string {
    const organizationId = session.session.activeOrganizationId;

    if (!organizationId) {
      throw new BadRequestException('Active organization is required');
    }

    return organizationId;
  }
}
