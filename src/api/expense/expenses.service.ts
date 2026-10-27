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
} from '../../generated/prisma/enums.js';
import { PrismaService } from '../../infra/prisma/prisma.service.js';
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

    if (dto.teacherId) {
      await this.assertTeacher(organizationId, dto.teacherId);
    }

    const expense = await this.prisma.expense.create({
      data: {
        organizationId,
        spentOn: this.parseDate(dto.spentOn),
        amount: dto.amount.toFixed(2),
        currency: organization.currency,
        category: dto.category,
        recipient: dto.recipient,
        method: dto.method,
        status: dto.status,
        description: dto.description,
        comment: dto.comment ?? null,
        teacherId: dto.teacherId ?? null,
        createdByUserId: session.user.id,
      },
      include: expenseInclude,
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

    if (dto.spentOn) {
      const organization = await this.prisma.organization.findUniqueOrThrow({
        where: { id: organizationId },
        select: { timezone: true },
      });

      this.assertNotInFuture(dto.spentOn, organization.timezone);
    }

    const category = dto.category ?? expense.category;
    // Преподаватель указывается только у зарплаты; при смене категории он отвязывается
    let teacherId =
      dto.teacherId === undefined ? expense.teacher?.id : dto.teacherId;

    if (category !== ExpenseCategory.SALARY) {
      if (dto.teacherId) {
        throw new BadRequestException(
          'teacherId is allowed only for SALARY expenses',
        );
      }

      teacherId = null;
    } else if (dto.teacherId) {
      await this.assertTeacher(organizationId, dto.teacherId);
    }

    const { count } = await this.prisma.expense.updateMany({
      where: { id, organizationId, status: { not: ExpenseStatus.CANCELED } },
      data: {
        spentOn: dto.spentOn ? this.parseDate(dto.spentOn) : undefined,
        amount: dto.amount?.toFixed(2),
        category: dto.category,
        recipient: dto.recipient,
        method: dto.method,
        status: dto.status,
        description: dto.description,
        comment: dto.comment === undefined ? undefined : dto.comment || null,
        teacherId: teacherId ?? null,
      },
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
    await this.findExpense(organizationId, id);

    const { count } = await this.prisma.expense.updateMany({
      where: { id, organizationId, status: { not: ExpenseStatus.CANCELED } },
      data: { status: ExpenseStatus.CANCELED },
    });

    if (count === 0) {
      throw new ConflictException('Expense is already canceled');
    }

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

  private async assertTeacher(
    organizationId: string,
    teacherId: string,
  ): Promise<void> {
    const teacher = await this.prisma.teacher.findFirst({
      where: { id: teacherId, organizationId },
      select: { id: true },
    });

    if (!teacher) {
      throw new BadRequestException('Teacher not found');
    }
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
      createdBy: expense.createdBy,
      createdAt: expense.createdAt.toISOString(),
    };
  }
}
