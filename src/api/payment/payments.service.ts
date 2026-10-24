import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma } from '../../generated/prisma/client.js';
import {
  PaymentStatus,
  SubscriptionStatus,
} from '../../generated/prisma/enums.js';
import { PrismaService } from '../../infra/prisma/prisma.service.js';
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

      return tx.payment.create({
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
    }

    const { subscription } = payment;

    if (dto.lessonsCount !== undefined && !subscription) {
      throw new ConflictException('Payment is not linked to a lesson package');
    }

    const amount = dto.amount?.toFixed(2);

    const updated = await this.prisma.$transaction(async (tx) => {
      if (subscription) {
        const data: Prisma.StudentSubscriptionUpdateInput = {};

        if (dto.lessonsCount !== undefined) {
          const used = subscription.lessonsTotal - subscription.lessonsLeft;

          if (dto.lessonsCount < used) {
            throw new ConflictException(
              `Package already has ${used} used lessons; lessonsCount cannot be lower`,
            );
          }

          const lessonsLeft = dto.lessonsCount - used;

          data.name = this.packageName(dto.lessonsCount);
          data.lessonsTotal = dto.lessonsCount;
          data.lessonsLeft = lessonsLeft;
          data.status =
            lessonsLeft === 0
              ? SubscriptionStatus.EXHAUSTED
              : SubscriptionStatus.ACTIVE;
        }

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

      return tx.payment.update({
        where: { id },
        data: {
          amount,
          method: dto.method,
          paidAt: dto.paidOn ? this.toPaidAt(dto.paidOn) : undefined,
          comment: dto.comment === undefined ? undefined : dto.comment || null,
        },
        include: paymentInclude,
      });
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
      throw new ConflictException(
        'Lessons from this package have already been used; the payment cannot be canceled',
      );
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
        await tx.studentSubscription.update({
          where: { id: subscription.id },
          data: { status: SubscriptionStatus.CANCELED, lessonsLeft: 0 },
        });
      }

      return tx.payment.findUniqueOrThrow({
        where: { id },
        include: paymentInclude,
      });
    });

    return this.toPaymentResponse(canceled);
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
    const today = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());

    if (paidOn > today) {
      throw new BadRequestException('paidOn cannot be in the future');
    }
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
