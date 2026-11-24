import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma } from '../../generated/prisma/client.js';
import {
  ExpenseCategory,
  ExpenseStatus,
  FinanceLogAction,
  FinanceLogEntity,
} from '../../generated/prisma/enums.js';
import { PrismaService } from '../../infra/prisma/prisma.service.js';
import { describePayoutCanceled } from '../finance-log/payout-log.js';
import { assertPeriodsOpen } from '../shared/period-lock.js';
import type { CreateExpenseDto } from './dto/create-expense.dto.js';
import type {
  ExpenseListResponseDto,
  ExpenseResponseDto,
} from './dto/expense-response.dto.js';
import type { ListExpensesQueryDto } from './dto/list-expenses-query.dto.js';
import type { UpdateExpenseDto } from './dto/update-expense.dto.js';

type OrganizationSession = {
  user: { id: string };
  session: { activeOrganizationId?: string | null };
};

const expenseInclude = {
  teacher: { select: { id: true, fullName: true } },
  createdBy: { select: { id: true, name: true } },
  _count: { select: { payoutLessons: true } },
} satisfies Prisma.ExpenseInclude;

type ExpenseWithRelations = Prisma.ExpenseGetPayload<{
  include: typeof expenseInclude;
}>;

@Injectable()
export class ExpensesService {
  constructor(private readonly prisma: PrismaService) {}

  async listExpenses(
    session: OrganizationSession,
    query: ListExpensesQueryDto,
  ): Promise<ExpenseListResponseDto> {
    const organizationId = this.getOrganizationId(session);
    const where: Prisma.ExpenseWhereInput = { organizationId };

    if (query.from || query.to) {
      where.spentOn = {
        gte: query.from ? this.parseDate(query.from) : undefined,
        lte: query.to ? this.parseDate(query.to) : undefined,
      };
    }

    if (query.category?.length) {
      where.category = { in: query.category };
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.teacherId) {
      where.teacherId = query.teacherId;
    }

    // Отменённые расходы в итоги не входят
    const activeWhere: Prisma.ExpenseWhereInput = {
      AND: [where, { status: { not: ExpenseStatus.CANCELED } }],
    };

    const [expenses, total, byStatus, byCategory] =
      await this.prisma.$transaction([
        this.prisma.expense.findMany({
          where,
          orderBy: [{ spentOn: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
          take: query.limit,
          skip: query.offset,
          include: expenseInclude,
        }),
        this.prisma.expense.count({ where }),
        this.prisma.expense.groupBy({
          by: ['status'],
          where: activeWhere,
          orderBy: { status: 'asc' },
          _sum: { amount: true },
          _count: { _all: true },
        }),
        this.prisma.expense.groupBy({
          by: ['category'],
          where: activeWhere,
          orderBy: { _sum: { amount: 'desc' } },
          _sum: { amount: true },
        }),
      ]);

    const sumOf = (status: ExpenseStatus) =>
      byStatus.find((group) => group.status === status)?._sum.amount ??
      new Prisma.Decimal(0);

    return {
      items: expenses.map((expense) => this.toExpenseResponse(expense)),
      total,
      limit: query.limit,
      offset: query.offset,
      summary: {
        paidAmount: sumOf(ExpenseStatus.PAID).toFixed(2),
        pendingAmount: sumOf(ExpenseStatus.PENDING).toFixed(2),
        expensesCount: byStatus.reduce(
          (count, group) => count + group._count._all,
          0,
        ),
        byCategory: byCategory.map((group) => ({
          category: group.category,
          amount: (group._sum.amount ?? new Prisma.Decimal(0)).toFixed(2),
        })),
      },
    };
  }

  async getExpense(
    session: OrganizationSession,
    id: string,
  ): Promise<ExpenseResponseDto> {
    const organizationId = this.getOrganizationId(session);
    const expense = await this.findExpense(organizationId, id);

    return this.toExpenseResponse(expense);
  }

  async createExpense(
    session: OrganizationSession,
    dto: CreateExpenseDto,
  ): Promise<ExpenseResponseDto> {
    const organizationId = this.getOrganizationId(session);
    const organization = await this.prisma.organization.findUniqueOrThrow({
      where: { id: organizationId },
      select: { currency: true, timezone: true },
    });

    this.assertNotInFuture(dto.spentOn, organization.timezone);

    const expense = await this.prisma.$transaction(async (tx) => {
      await assertPeriodsOpen(tx, organizationId, [dto.spentOn]);

      return tx.expense.create({
        data: {
          organizationId,
          spentOn: this.parseDate(dto.spentOn),
          amount: dto.amount.toFixed(2),
          currency: organization.currency,
          category: dto.category,
          recipient: dto.recipient ?? null,
          method: dto.method,
          status: dto.status,
          description: dto.description,
          comment: dto.comment ?? null,
          // Преподаватель указывается только у выплат из POST /payouts
          teacherId: null,
          createdByUserId: session.user.id,
        },
        include: expenseInclude,
      });
    });

    return this.toExpenseResponse(expense);
  }

  async updateExpense(
    session: OrganizationSession,
    id: string,
    dto: UpdateExpenseDto,
  ): Promise<ExpenseResponseDto> {
    const organizationId = this.getOrganizationId(session);
    const expense = await this.findExpense(organizationId, id);

    if (expense.status === ExpenseStatus.CANCELED) {
      throw new ConflictException('Canceled expenses cannot be edited');
    }

    // Сумма выплаты равна начислениям за её занятия, поэтому меняются
    // только дата, способ, описание и комментарий
    if (expense._count.payoutLessons > 0 && this.changesPayout(expense, dto)) {
      throw new ConflictException(
        'Payout amount, category, teacher and status cannot be edited; cancel the payout instead',
      );
    }

    if (dto.spentOn) {
      const organization = await this.prisma.organization.findUniqueOrThrow({
        where: { id: organizationId },
        select: { timezone: true },
      });

      this.assertNotInFuture(dto.spentOn, organization.timezone);
    }

    const category = dto.category ?? expense.category;
    // Новую привязку к преподавателю создаёт только POST /payouts. Здесь
    // преподавателя можно лишь отвязать (dto.teacherId = null) у старого
    // ручного расхода; при смене категории он отвязывается сам
    const teacherId =
      category === ExpenseCategory.SALARY && dto.teacherId === undefined
        ? (expense.teacher?.id ?? null)
        : null;

    const spentOn = this.toSpentOn(expense.spentOn);
    // В закрытом месяце можно поправить только описание, получателя и комментарий
    const changesMoney =
      (dto.spentOn !== undefined && dto.spentOn !== spentOn) ||
      (dto.amount !== undefined && !expense.amount.equals(dto.amount)) ||
      category !== expense.category ||
      (dto.method !== undefined && dto.method !== expense.method) ||
      (dto.status !== undefined && dto.status !== expense.status) ||
      teacherId !== (expense.teacher?.id ?? null);

    const count = await this.prisma.$transaction(async (tx) => {
      if (changesMoney) {
        await assertPeriodsOpen(tx, organizationId, [
          spentOn,
          dto.spentOn ?? spentOn,
        ]);
      }

      const result = await tx.expense.updateMany({
        where: { id, organizationId, status: { not: ExpenseStatus.CANCELED } },
        data: {
          spentOn: dto.spentOn ? this.parseDate(dto.spentOn) : undefined,
          amount: dto.amount?.toFixed(2),
          category: dto.category,
          recipient:
            dto.recipient === undefined ? undefined : dto.recipient || null,
          method: dto.method,
          status: dto.status,
          description: dto.description,
          comment: dto.comment === undefined ? undefined : dto.comment || null,
          teacherId,
        },
      });

      return result.count;
    });

    if (count === 0) {
      throw new ConflictException('Canceled expenses cannot be edited');
    }

    return this.toExpenseResponse(await this.findExpense(organizationId, id));
  }

  async cancelExpense(
    session: OrganizationSession,
    id: string,
  ): Promise<ExpenseResponseDto> {
    const organizationId = this.getOrganizationId(session);
    const expense = await this.findExpense(organizationId, id);

    await this.prisma.$transaction(async (tx) => {
      await assertPeriodsOpen(tx, organizationId, [
        this.toSpentOn(expense.spentOn),
      ]);

      const { count } = await tx.expense.updateMany({
        where: { id, organizationId, status: { not: ExpenseStatus.CANCELED } },
        data: { status: ExpenseStatus.CANCELED },
      });

      if (count === 0) {
        throw new ConflictException('Expense is already canceled');
      }

      // Занятия отменённой выплаты снова ждут оплаты
      const { count: lessonsCount } = await tx.lesson.updateMany({
        where: { organizationId, payoutExpenseId: id },
        data: { payoutExpenseId: null },
      });

      // Расход с занятиями — выплата преподавателю: её отмена попадает в журнал
      if (lessonsCount > 0) {
        await tx.financeLog.create({
          data: {
            organizationId,
            entityType: FinanceLogEntity.PAYOUT,
            entityId: id,
            teacherId: expense.teacher?.id ?? null,
            action: FinanceLogAction.CANCELED,
            description: describePayoutCanceled({
              teacherName:
                expense.teacher?.fullName ?? expense.recipient ?? '—',
              amount: expense.amount.toFixed(2),
              currency: expense.currency,
              lessonsCount,
              method: expense.method,
              paidOn: expense.spentOn.toISOString().slice(0, 10),
            }),
            actorUserId: session.user.id,
          },
        });
      }
    });

    return this.toExpenseResponse(await this.findExpense(organizationId, id));
  }

  private async findExpense(
    organizationId: string,
    id: string,
  ): Promise<ExpenseWithRelations> {
    const expense = await this.prisma.expense.findFirst({
      where: { id, organizationId },
      include: expenseInclude,
    });

    if (!expense) {
      throw new NotFoundException('Expense not found');
    }

    return expense;
  }

  private changesPayout(
    expense: ExpenseWithRelations,
    dto: UpdateExpenseDto,
  ): boolean {
    return (
      (dto.amount !== undefined && !expense.amount.equals(dto.amount)) ||
      (dto.category !== undefined && dto.category !== expense.category) ||
      (dto.status !== undefined && dto.status !== expense.status) ||
      (dto.teacherId !== undefined &&
        dto.teacherId !== (expense.teacher?.id ?? null))
    );
  }

  private assertNotInFuture(spentOn: string, timezone: string): void {
    const today = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());

    if (spentOn > today) {
      throw new BadRequestException('spentOn cannot be in the future');
    }
  }

  private parseDate(date: string): Date {
    return new Date(`${date}T00:00:00.000Z`);
  }

  private toSpentOn(spentOn: Date): string {
    return spentOn.toISOString().slice(0, 10);
  }

  private getOrganizationId(session: OrganizationSession): string {
    const organizationId = session.session.activeOrganizationId;

    if (!organizationId) {
      throw new BadRequestException('Active organization is required');
    }

    return organizationId;
  }

  private toExpenseResponse(expense: ExpenseWithRelations): ExpenseResponseDto {
    return {
      id: expense.id,
      spentOn: expense.spentOn.toISOString().slice(0, 10),
      amount: expense.amount.toFixed(2),
      currency: expense.currency,
      category: expense.category,
      recipient: expense.recipient,
      method: expense.method,
      status: expense.status,
      description: expense.description,
      comment: expense.comment,
      teacher: expense.teacher,
      payoutLessonsCount: expense._count.payoutLessons,
      createdBy: expense.createdBy,
      createdAt: expense.createdAt.toISOString(),
    };
  }
}
