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
  PaymentStatus,
  SubscriptionStatus,
  SubscriptionUsageType,
} from '../../generated/prisma/enums.js';
import { PrismaService } from '../../infra/prisma/prisma.service.js';
import {
  describeCanceled,
  describeCreated,
  diffPayment,
  type PaymentChanges,
  type PaymentSnapshot,
  studentName,
  toJson,
} from '../finance-log/payment-log.js';
import type { CreatePaymentDto } from './dto/create-payment.dto.js';
import type { ListPaymentsQueryDto } from './dto/list-payments-query.dto.js';
import type {
  PaymentListResponseDto,
  PaymentResponseDto,
} from './dto/payment-response.dto.js';
import type { UpdatePaymentDto } from './dto/update-payment.dto.js';

type OrganizationSession = {
  user: { id: string };
  session: { activeOrganizationId?: string | null };
};

const paymentInclude = {
  student: { select: { id: true, firstName: true, lastName: true } },
  subscription: {
    select: { id: true, lessonsTotal: true, lessonsLeft: true, status: true },
  },
  createdBy: { select: { id: true, name: true } },
} satisfies Prisma.PaymentInclude;

type PaymentWithRelations = Prisma.PaymentGetPayload<{
  include: typeof paymentInclude;
}>;

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  async listPayments(
    session: OrganizationSession,
    query: ListPaymentsQueryDto,
  ): Promise<PaymentListResponseDto> {
    const organizationId = this.getOrganizationId(session);
    const where: Prisma.PaymentWhereInput = { organizationId };

    if (query.from || query.to) {
      where.paidAt = {
        gte: query.from ? new Date(`${query.from}T00:00:00.000Z`) : undefined,
        lte: query.to ? new Date(`${query.to}T23:59:59.999Z`) : undefined,
      };
    }

    if (query.studentId) {
      where.studentId = query.studentId;
    }

    if (query.method) {
      where.method = query.method;
    }

    if (query.status) {
      where.status = query.status;
    }

    // Итоги считаются только по проведённым оплатам
    const completedWhere: Prisma.PaymentWhereInput = {
      AND: [where, { status: PaymentStatus.COMPLETED }],
    };

    const [payments, total, amountSummary, lessonsSummary] =
      await this.prisma.$transaction([
        this.prisma.payment.findMany({
          where,
          orderBy: [{ paidAt: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
          take: query.limit,
          skip: query.offset,
          include: paymentInclude,
        }),
        this.prisma.payment.count({ where }),
        this.prisma.payment.aggregate({
          where: completedWhere,
          _sum: { amount: true },
          _count: { _all: true },
        }),
        this.prisma.studentSubscription.aggregate({
          where: { organizationId, payments: { some: completedWhere } },
          _sum: { lessonsTotal: true },
        }),
      ]);

    return {
      items: payments.map((payment) => this.toPaymentResponse(payment)),
      total,
      limit: query.limit,
      offset: query.offset,
      summary: {
        totalAmount: (
          amountSummary._sum.amount ?? new Prisma.Decimal(0)
        ).toFixed(2),
        paymentsCount: amountSummary._count._all,
        lessonsCount: lessonsSummary._sum.lessonsTotal ?? 0,
      },
    };
  }

  async getPayment(
    session: OrganizationSession,
    id: string,
  ): Promise<PaymentResponseDto> {
    const organizationId = this.getOrganizationId(session);
    const payment = await this.findPayment(organizationId, id);

    return this.toPaymentResponse(payment);
  }

  async createPayment(
    session: OrganizationSession,
    dto: CreatePaymentDto,
  ): Promise<PaymentResponseDto> {
    const organizationId = this.getOrganizationId(session);
    const organization = await this.prisma.organization.findUniqueOrThrow({
      where: { id: organizationId },
      select: { currency: true, timezone: true },
    });

    this.assertNotInFuture(dto.paidOn, organization.timezone);

    const student = await this.prisma.student.findFirst({
      where: { id: dto.studentId, organizationId },
      select: { id: true },
    });

    if (!student) {
      throw new BadRequestException('Student not found');
    }

    const amount = dto.amount.toFixed(2);

    const payment = await this.prisma.$transaction(async (tx) => {
      const subscription = await tx.studentSubscription.create({
        data: {
          organizationId,
          studentId: dto.studentId,
          name: this.packageName(dto.lessonsCount),
          lessonsTotal: dto.lessonsCount,
          lessonsLeft: dto.lessonsCount,
          price: amount,
          purchasedOn: this.parseDate(dto.paidOn),
        },
      });

      // Начисление пакета — первая запись журнала, чтобы сумма lessonsDelta
      // совпадала с остатком
      await tx.subscriptionUsage.create({
        data: {
          organizationId,
          subscriptionId: subscription.id,
          studentId: dto.studentId,
          type: SubscriptionUsageType.ADJUSTMENT,
          lessonsDelta: dto.lessonsCount,
          comment: 'Оплата',
          createdByUserId: session.user.id,
        },
      });

      const created = await tx.payment.create({
        data: {
          organizationId,
          studentId: dto.studentId,
          subscriptionId: subscription.id,
          amount,
          currency: organization.currency,
          method: dto.method,
          paidAt: this.toPaidAt(dto.paidOn),
          comment: dto.comment ?? null,
          createdByUserId: session.user.id,
        },
        include: paymentInclude,
      });

      await this.writeLog(tx, session, created, {
        action: FinanceLogAction.CREATED,
        description: describeCreated(this.toSnapshot(created)),
      });

      return created;
    });

    return this.toPaymentResponse(payment);
  }

  async updatePayment(
    session: OrganizationSession,
    id: string,
    dto: UpdatePaymentDto,
  ): Promise<PaymentResponseDto> {
    const organizationId = this.getOrganizationId(session);
    const payment = await this.findPayment(organizationId, id);

    if (payment.status !== PaymentStatus.COMPLETED) {
      throw new ConflictException('Only completed payments can be edited');
    }

    if (dto.paidOn) {
      const organization = await this.prisma.organization.findUniqueOrThrow({
        where: { id: organizationId },
        select: { timezone: true },
      });

      this.assertNotInFuture(dto.paidOn, organization.timezone);
      this.assertMonthOpen(
        payment.paidAt.toISOString().slice(0, 10),
        dto.paidOn,
        organization.timezone,
      );
    }

    const { subscription } = payment;

    if (dto.lessonsCount !== undefined && !subscription) {
      throw new ConflictException('Payment is not linked to a lesson package');
    }

    const amount = dto.amount?.toFixed(2);

    const updated = await this.prisma.$transaction(async (tx) => {
      // Условное обновление блокирует строку оплаты до конца транзакции:
      // параллельная отмена дождётся нас или, наоборот, мы получим count = 0
      const { count } = await tx.payment.updateMany({
        where: { id, organizationId, status: PaymentStatus.COMPLETED },
        data: {
          amount,
          method: dto.method,
          paidAt: dto.paidOn ? this.toPaidAt(dto.paidOn) : undefined,
          comment: dto.comment === undefined ? undefined : dto.comment || null,
        },
      });

      if (count === 0) {
        throw new ConflictException('Only completed payments can be edited');
      }

      if (subscription) {
        if (dto.lessonsCount !== undefined) {
          await this.changePackageSize(
            tx,
            organizationId,
            subscription.id,
            dto.lessonsCount,
            session.user.id,
          );
        }

        const data: Prisma.StudentSubscriptionUpdateInput = {};

        if (amount !== undefined) {
          data.price = amount;
        }

        if (dto.paidOn) {
          data.purchasedOn = this.parseDate(dto.paidOn);
        }

        if (Object.keys(data).length > 0) {
          await tx.studentSubscription.update({
            where: { id: subscription.id },
            data,
          });
        }
      }

      const fresh = await tx.payment.findUniqueOrThrow({
        where: { id },
        include: paymentInclude,
      });
      const diff = diffPayment(
        this.toSnapshot(payment),
        this.toSnapshot(fresh),
      );

      if (diff) {
        await this.writeLog(tx, session, fresh, {
          action: FinanceLogAction.UPDATED,
          description: diff.description,
          changes: diff.changes,
        });
      }

      return fresh;
    });

    return this.toPaymentResponse(updated);
  }

  async cancelPayment(
    session: OrganizationSession,
    id: string,
  ): Promise<PaymentResponseDto> {
    const organizationId = this.getOrganizationId(session);
    const payment = await this.findPayment(organizationId, id);

    if (payment.status !== PaymentStatus.COMPLETED) {
      throw new ConflictException('Payment is already canceled');
    }

    const { subscription } = payment;

    if (subscription && subscription.lessonsLeft < subscription.lessonsTotal) {
      throw this.packageUsedException();
    }

    const canceled = await this.prisma.$transaction(async (tx) => {
      const { count } = await tx.payment.updateMany({
        where: { id, organizationId, status: PaymentStatus.COMPLETED },
        data: { status: PaymentStatus.CANCELED },
      });

      if (count === 0) {
        throw new ConflictException('Payment is already canceled');
      }

      if (subscription) {
        // Размер пакета меняется только через оплату, а она уже заблокирована
        const { lessonsTotal } = await tx.studentSubscription.findUniqueOrThrow(
          { where: { id: subscription.id }, select: { lessonsTotal: true } },
        );

        // Условие по остатку не даст аннулировать пакет, если занятие
        // успели списать после проверки выше
        const { count: canceledPackages } =
          await tx.studentSubscription.updateMany({
            where: {
              id: subscription.id,
              status: { not: SubscriptionStatus.CANCELED },
              lessonsLeft: lessonsTotal,
            },
            data: { status: SubscriptionStatus.CANCELED, lessonsLeft: 0 },
          });

        if (canceledPackages === 0) {
          throw this.packageUsedException();
        }

        if (lessonsTotal > 0) {
          await tx.subscriptionUsage.create({
            data: {
              organizationId,
              subscriptionId: subscription.id,
              studentId: payment.student.id,
              type: SubscriptionUsageType.ADJUSTMENT,
              lessonsDelta: -lessonsTotal,
              comment: 'Отмена оплаты',
              createdByUserId: session.user.id,
            },
          });
        }
      }

      await this.writeLog(tx, session, payment, {
        action: FinanceLogAction.CANCELED,
        description: describeCanceled(this.toSnapshot(payment)),
      });

      return tx.payment.findUniqueOrThrow({
        where: { id },
        include: paymentInclude,
      });
    });

    return this.toPaymentResponse(canceled);
  }

  /**
   * Меняет количество занятий в пакете на разницу (дельту), а не перезаписывает
   * остаток: так не теряются списания, которые прошли параллельно.
   * Каждое изменение пишется в журнал SubscriptionUsage как ADJUSTMENT.
   */
  private async changePackageSize(
    tx: Prisma.TransactionClient,
    organizationId: string,
    subscriptionId: string,
    lessonsCount: number,
    userId: string,
  ): Promise<void> {
    const current = await tx.studentSubscription.findUniqueOrThrow({
      where: { id: subscriptionId },
      select: { studentId: true, lessonsTotal: true },
    });
    const delta = lessonsCount - current.lessonsTotal;

    if (delta === 0) {
      return;
    }

    // Новый остаток = lessonsLeft + delta ≥ 0, то есть занятий не меньше,
    // чем уже списано. Postgres перепроверит условие по свежей строке,
    // если её параллельно изменило списание занятия.
    const { count } = await tx.studentSubscription.updateMany({
      where: {
        id: subscriptionId,
        status: { not: SubscriptionStatus.CANCELED },
        lessonsTotal: current.lessonsTotal,
        lessonsLeft: { gte: -delta },
      },
      data: {
        name: this.packageName(lessonsCount),
        lessonsTotal: lessonsCount,
        lessonsLeft: { increment: delta },
      },
    });

    if (count === 0) {
      const fresh = await tx.studentSubscription.findUniqueOrThrow({
        where: { id: subscriptionId },
        select: { lessonsTotal: true, lessonsLeft: true },
      });
      const used = fresh.lessonsTotal - fresh.lessonsLeft;

      throw new ConflictException(
        `Package already has ${used} used lessons; lessonsCount cannot be lower`,
      );
    }

    await tx.studentSubscription.updateMany({
      where: { id: subscriptionId, lessonsLeft: 0 },
      data: { status: SubscriptionStatus.EXHAUSTED },
    });
    await tx.studentSubscription.updateMany({
      where: { id: subscriptionId, lessonsLeft: { gt: 0 } },
      data: { status: SubscriptionStatus.ACTIVE },
    });

    await tx.subscriptionUsage.create({
      data: {
        organizationId,
        subscriptionId,
        studentId: current.studentId,
        type: SubscriptionUsageType.ADJUSTMENT,
        lessonsDelta: delta,
        comment: `Изменение оплаты: ${current.lessonsTotal} → ${lessonsCount} зан.`,
        createdByUserId: userId,
      },
    });
  }

  private async writeLog(
    tx: Prisma.TransactionClient,
    session: OrganizationSession,
    payment: PaymentWithRelations,
    entry: {
      action: FinanceLogAction;
      description: string;
      changes?: PaymentChanges;
    },
  ): Promise<void> {
    await tx.financeLog.create({
      data: {
        organizationId: this.getOrganizationId(session),
        entityType: FinanceLogEntity.PAYMENT,
        entityId: payment.id,
        studentId: payment.student.id,
        action: entry.action,
        description: entry.description,
        changes: entry.changes ? toJson(entry.changes) : undefined,
        actorUserId: session.user.id,
      },
    });
  }

  private toSnapshot(payment: PaymentWithRelations): PaymentSnapshot {
    return {
      amount: payment.amount.toFixed(2),
      currency: payment.currency,
      method: payment.method,
      paidOn: payment.paidAt.toISOString().slice(0, 10),
      comment: payment.comment,
      lessonsCount: payment.subscription?.lessonsTotal ?? null,
      studentName: studentName(payment.student),
    };
  }

  private packageUsedException(): ConflictException {
    return new ConflictException(
      'Lessons from this package have already been used; the payment cannot be canceled',
    );
  }

  private async findPayment(
    organizationId: string,
    id: string,
  ): Promise<PaymentWithRelations> {
    const payment = await this.prisma.payment.findFirst({
      where: { id, organizationId },
      include: paymentInclude,
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    return payment;
  }

  private assertNotInFuture(paidOn: string, timezone: string): void {
    if (paidOn > this.schoolToday(timezone)) {
      throw new BadRequestException('paidOn cannot be in the future');
    }
  }

  /**
   * Прошлые месяцы считаются закрытыми: перенос даты в них или из них
   * переписал бы доход за период, по которому уже подведены итоги.
   * Дату можно двигать только внутри текущего месяца школы.
   */
  private assertMonthOpen(
    currentPaidOn: string,
    nextPaidOn: string,
    timezone: string,
  ): void {
    if (currentPaidOn === nextPaidOn) {
      return;
    }

    const monthStart = `${this.schoolToday(timezone).slice(0, 7)}-01`;

    if (currentPaidOn < monthStart || nextPaidOn < monthStart) {
      throw new ConflictException(
        'Payment date cannot be moved into or out of a closed month',
      );
    }
  }

  private schoolToday(timezone: string): string {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
  }

  private packageName(lessonsCount: number): string {
    return `Пакет: ${lessonsCount} зан.`;
  }

  private parseDate(date: string): Date {
    return new Date(`${date}T00:00:00.000Z`);
  }

  // Храним полдень UTC, чтобы дата оплаты не съезжала при смене часового пояса
  private toPaidAt(date: string): Date {
    return new Date(`${date}T12:00:00.000Z`);
  }

  private getOrganizationId(session: OrganizationSession): string {
    const organizationId = session.session.activeOrganizationId;

    if (!organizationId) {
      throw new BadRequestException('Active organization is required');
    }

    return organizationId;
  }

  private toPaymentResponse(payment: PaymentWithRelations): PaymentResponseDto {
    return {
      id: payment.id,
      student: payment.student,
      amount: payment.amount.toFixed(2),
      currency: payment.currency,
      lessonsCount: payment.subscription?.lessonsTotal ?? null,
      method: payment.method,
      status: payment.status,
      paidOn: payment.paidAt.toISOString().slice(0, 10),
      comment: payment.comment,
      createdBy: payment.createdBy,
      createdAt: payment.createdAt.toISOString(),
    };
  }
}
