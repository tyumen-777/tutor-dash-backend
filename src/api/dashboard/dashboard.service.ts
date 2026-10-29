import { BadRequestException, Injectable } from '@nestjs/common';

import { Prisma } from '../../generated/prisma/client.js';
import {
  ExpenseStatus,
  LessonStatus,
  PaymentStatus,
  StudentStatus,
  SubscriptionStatus,
} from '../../generated/prisma/enums.js';
import { PrismaService } from '../../infra/prisma/prisma.service.js';
import type { DashboardSummaryResponseDto } from './dto/dashboard-summary-response.dto.js';
import {
  addDays,
  previousMonthRange,
  schoolToday,
  startOfSchoolDay,
} from './school-date.js';

type OrganizationSession = {
  user: { id: string };
  session: { activeOrganizationId?: string | null };
};

// Совпадает с доступом к GET /expenses
const EXPENSE_ROLES = ['owner', 'admin', 'accountant'];

const LOW_BALANCE_THRESHOLD = 1;
const TEACHERS_LIMIT = 5;
const LOW_BALANCE_LIMIT = 5;
const NEW_STUDENTS_DAYS = 30;
const MINUTE_MS = 60_000;

const studentRefSelect = {
  id: true,
  firstName: true,
  lastName: true,
} satisfies Prisma.StudentSelect;

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(
    session: OrganizationSession,
  ): Promise<DashboardSummaryResponseDto> {
    const organizationId = this.getOrganizationId(session);
    const [organization, member] = await Promise.all([
      this.prisma.organization.findUniqueOrThrow({
        where: { id: organizationId },
        select: { currency: true, timezone: true },
      }),
      this.prisma.member.findUnique({
        where: {
          organizationId_userId: { organizationId, userId: session.user.id },
        },
        select: { role: true },
      }),
    ]);
    const { timezone } = organization;
    const canSeeExpenses = (member?.role ?? '')
      .split(',')
      .some((role) => EXPENSE_ROLES.includes(role.trim()));

    const today = schoolToday(timezone);
    const from = `${today.slice(0, 7)}-01`;
    const previous = previousMonthRange(from, today);
    const monthLessons = {
      gte: startOfSchoolDay(from, timezone),
      lt: startOfSchoolDay(addDays(today, 1), timezone),
    };

    const [
      income,
      previousIncome,
      expenses,
      students,
      lessons,
      todayLessons,
      teachers,
      lowBalanceStudents,
    ] = await Promise.all([
      this.sumPayments(organizationId, from, today),
      this.sumPayments(organizationId, previous.from, previous.to),
      canSeeExpenses
        ? this.getExpenses(organizationId, from, today)
        : Promise.resolve(null),
      this.getStudentCounts(organizationId, today),
      this.getLessonCounts(organizationId, monthLessons, today, timezone),
      this.getTodayLessons(organizationId, today, timezone),
      this.getTeacherWorkload(organizationId, monthLessons),
      this.getLowBalanceStudents(organizationId),
    ]);

    return {
      currency: organization.currency,
      today,
      period: { from, to: today },
      income: {
        amount: income.amount.toFixed(2),
        previousAmount: previousIncome.amount.toFixed(2),
        paymentsCount: income.count,
      },
      expenses: expenses && {
        paidAmount: expenses.paidAmount.toFixed(2),
        pendingAmount: expenses.pendingAmount.toFixed(2),
        pendingCount: expenses.pendingCount,
      },
      profit: expenses
        ? income.amount.minus(expenses.paidAmount).toFixed(2)
        : null,
      students: {
        ...students,
        lowBalanceCount: lowBalanceStudents.count,
      },
      lessons,
      todayLessons,
      teachers,
      lowBalanceStudents: lowBalanceStudents.items,
    };
  }

  // Оплата хранится как дата (полдень UTC), поэтому границы — сутки UTC
  private async sumPayments(organizationId: string, from: string, to: string) {
    const result = await this.prisma.payment.aggregate({
      where: {
        organizationId,
        status: PaymentStatus.COMPLETED,
        paidAt: {
          gte: new Date(`${from}T00:00:00.000Z`),
          lte: new Date(`${to}T23:59:59.999Z`),
        },
      },
      _sum: { amount: true },
      _count: { _all: true },
    });

    return {
      amount: result._sum.amount ?? new Prisma.Decimal(0),
      count: result._count._all,
    };
  }

  private async getExpenses(organizationId: string, from: string, to: string) {
    const [paid, pending] = await this.prisma.$transaction([
      this.prisma.expense.aggregate({
        where: {
          organizationId,
          status: ExpenseStatus.PAID,
          spentOn: {
            gte: new Date(`${from}T00:00:00.000Z`),
            lte: new Date(`${to}T00:00:00.000Z`),
          },
        },
        _sum: { amount: true },
      }),
      this.prisma.expense.aggregate({
        where: { organizationId, status: ExpenseStatus.PENDING },
        _sum: { amount: true },
        _count: { _all: true },
      }),
    ]);

    return {
      paidAmount: paid._sum.amount ?? new Prisma.Decimal(0),
      pendingAmount: pending._sum.amount ?? new Prisma.Decimal(0),
      pendingCount: pending._count._all,
    };
  }

  private async getStudentCounts(organizationId: string, today: string) {
    const [byStatus, newCount] = await this.prisma.$transaction([
      this.prisma.student.groupBy({
        by: ['status'],
        where: { organizationId },
        orderBy: { status: 'asc' },
        _count: { _all: true },
      }),
      this.prisma.student.count({
        where: {
          organizationId,
          status: { not: StudentStatus.ARCHIVED },
          createdAt: {
            gte: new Date(
              `${addDays(today, -NEW_STUDENTS_DAYS)}T00:00:00.000Z`,
            ),
          },
        },
      }),
    ]);
    const countOf = (status: StudentStatus) => {
      const group = byStatus.find((item) => item.status === status);
      const groupCount = group?._count;

      return typeof groupCount === 'object' ? (groupCount._all ?? 0) : 0;
    };

    return {
      activeCount: countOf(StudentStatus.ACTIVE),
      pausedCount: countOf(StudentStatus.PAUSED),
      newCount,
    };
  }

  private async getLessonCounts(
    organizationId: string,
    monthLessons: Prisma.DateTimeFilter,
    today: string,
    timezone: string,
  ) {
    const [completed, canceledCount, todayCount] =
      await this.prisma.$transaction([
        this.prisma.lesson.aggregate({
          where: {
            organizationId,
            status: LessonStatus.COMPLETED,
            startsAt: monthLessons,
          },
          _sum: { teacherPay: true },
          _count: { _all: true },
        }),
        this.prisma.lesson.count({
          where: {
            organizationId,
            status: LessonStatus.CANCELED,
            startsAt: monthLessons,
          },
        }),
        this.prisma.lesson.count({
          where: {
            organizationId,
            status: { in: [LessonStatus.SCHEDULED, LessonStatus.COMPLETED] },
            startsAt: this.dayRange(today, timezone),
          },
        }),
      ]);

    return {
      todayCount,
      completedCount: completed._count._all,
      canceledCount,
      teacherPayTotal: (
        completed._sum.teacherPay ?? new Prisma.Decimal(0)
      ).toFixed(2),
    };
  }

  private async getTodayLessons(
    organizationId: string,
    today: string,
    timezone: string,
  ) {
    const lessons = await this.prisma.lesson.findMany({
      where: { organizationId, startsAt: this.dayRange(today, timezone) },
      orderBy: [{ startsAt: 'asc' }, { id: 'asc' }],
      select: {
        id: true,
        startsAt: true,
        endsAt: true,
        status: true,
        topic: true,
        teacher: { select: { id: true, fullName: true } },
        participants: {
          select: { student: { select: studentRefSelect } },
          take: 1,
        },
      },
    });

    return lessons.map((lesson) => ({
      id: lesson.id,
      startsAt: lesson.startsAt.toISOString(),
      durationMin: Math.round(
        (lesson.endsAt.getTime() - lesson.startsAt.getTime()) / MINUTE_MS,
      ),
      status: lesson.status,
      topic: lesson.topic,
      teacher: lesson.teacher,
      student: lesson.participants[0]?.student ?? null,
    }));
  }

  private async getTeacherWorkload(
    organizationId: string,
    monthLessons: Prisma.DateTimeFilter,
  ) {
    const teachers = await this.prisma.teacher.findMany({
      where: { organizationId, isActive: true },
      select: {
        id: true,
        fullName: true,
        lessons: {
          where: { status: LessonStatus.COMPLETED, startsAt: monthLessons },
          select: {
            startsAt: true,
            endsAt: true,
            participants: { select: { studentId: true } },
          },
        },
      },
    });

    return teachers
      .map((teacher) => ({
        id: teacher.id,
        fullName: teacher.fullName,
        lessonsCount: teacher.lessons.length,
        minutes: teacher.lessons.reduce(
          (sum, lesson) =>
            sum +
            Math.round(
              (lesson.endsAt.getTime() - lesson.startsAt.getTime()) / MINUTE_MS,
            ),
          0,
        ),
        studentsCount: new Set(
          teacher.lessons.flatMap((lesson) =>
            lesson.participants.map((participant) => participant.studentId),
          ),
        ).size,
      }))
      .sort(
        (a, b) =>
          b.lessonsCount - a.lessonsCount ||
          a.fullName.localeCompare(b.fullName, 'ru'),
      )
      .slice(0, TEACHERS_LIMIT);
  }

  // Остаток — сумма по неотменённым пакетам, как в GET /students/:id/balance
  private async getLowBalanceStudents(organizationId: string) {
    const [students, balances] = await this.prisma.$transaction([
      this.prisma.student.findMany({
        where: { organizationId, status: StudentStatus.ACTIVE },
        select: studentRefSelect,
      }),
      this.prisma.studentSubscription.groupBy({
        by: ['studentId'],
        where: {
          organizationId,
          status: { not: SubscriptionStatus.CANCELED },
        },
        orderBy: { studentId: 'asc' },
        _sum: { lessonsLeft: true },
      }),
    ]);
    const lessonsLeftByStudent = new Map(
      balances.map((balance) => [
        balance.studentId,
        balance._sum?.lessonsLeft ?? 0,
      ]),
    );
    const lowBalance = students
      .map((student) => ({
        ...student,
        lessonsLeft: lessonsLeftByStudent.get(student.id) ?? 0,
      }))
      .filter((student) => student.lessonsLeft <= LOW_BALANCE_THRESHOLD)
      .sort(
        (a, b) =>
          a.lessonsLeft - b.lessonsLeft ||
          a.firstName.localeCompare(b.firstName, 'ru'),
      );

    return {
      count: lowBalance.length,
      items: lowBalance.slice(0, LOW_BALANCE_LIMIT),
    };
  }

  private dayRange(date: string, timezone: string): Prisma.DateTimeFilter {
    return {
      gte: startOfSchoolDay(date, timezone),
      lt: startOfSchoolDay(addDays(date, 1), timezone),
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
