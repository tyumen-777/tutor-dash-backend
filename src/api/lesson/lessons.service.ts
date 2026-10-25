import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma } from '../../generated/prisma/client.js';
import {
  AttendanceStatus,
  LessonStatus,
  StudentStatus,
  SubscriptionStatus,
  SubscriptionUsageType,
} from '../../generated/prisma/enums.js';
import { PrismaService } from '../../infra/prisma/prisma.service.js';
import type { CancelLessonDto } from './dto/cancel-lesson.dto.js';
import type { CreateLessonDto } from './dto/create-lesson.dto.js';
import type { ListLessonsQueryDto } from './dto/list-lessons-query.dto.js';
import type {
  LessonListResponseDto,
  LessonResponseDto,
} from './dto/lesson-response.dto.js';
import { calculateTeacherPay } from './lesson-pay.js';

type OrganizationSession = {
  user: { id: string };
  session: { activeOrganizationId?: string | null };
};

const lessonInclude = {
  teacher: { select: { id: true, fullName: true } },
  participants: {
    select: {
      student: { select: { id: true, firstName: true, lastName: true } },
    },
    take: 1,
  },
  organization: { select: { currency: true } },
} satisfies Prisma.LessonInclude;

type LessonWithRelations = Prisma.LessonGetPayload<{
  include: typeof lessonInclude;
}>;

const MINUTE_MS = 60_000;

@Injectable()
export class LessonsService {
  constructor(private readonly prisma: PrismaService) {}

  async listLessons(
    session: OrganizationSession,
    query: ListLessonsQueryDto,
  ): Promise<LessonListResponseDto> {
    const organizationId = this.getOrganizationId(session);
    const where: Prisma.LessonWhereInput = { organizationId };

    if (query.from || query.to) {
      const { timezone } = await this.prisma.organization.findUniqueOrThrow({
        where: { id: organizationId },
        select: { timezone: true },
      });

      // Границы периода — сутки в часовом поясе школы
      where.startsAt = {
        gte: query.from ? this.startOfDay(query.from, timezone) : undefined,
        lt: query.to
          ? this.startOfDay(this.nextDay(query.to), timezone)
          : undefined,
      };
    }

    if (query.teacherId) {
      where.teacherId = query.teacherId;
    }

    if (query.studentId) {
      where.participants = { some: { studentId: query.studentId } };
    }

    if (query.status) {
      where.status = query.status;
    }

    const [lessons, total, completedSummary, canceledCount] =
      await this.prisma.$transaction([
        this.prisma.lesson.findMany({
          where,
          orderBy: [
            { startsAt: 'desc' },
            { createdAt: 'desc' },
            { id: 'desc' },
          ],
          take: query.limit,
          skip: query.offset,
          include: lessonInclude,
        }),
        this.prisma.lesson.count({ where }),
        this.prisma.lesson.aggregate({
          where: { AND: [where, { status: LessonStatus.COMPLETED }] },
          _sum: { teacherPay: true },
          _count: { _all: true },
        }),
        this.prisma.lesson.count({
          where: { AND: [where, { status: LessonStatus.CANCELED }] },
        }),
      ]);

    return {
      items: lessons.map((lesson) => this.toLessonResponse(lesson)),
      total,
      limit: query.limit,
      offset: query.offset,
      summary: {
        lessonsCount: completedSummary._count._all,
        teacherPayTotal: (
          completedSummary._sum.teacherPay ?? new Prisma.Decimal(0)
        ).toFixed(2),
        canceledCount,
      },
    };
  }

  async getLesson(
    session: OrganizationSession,
    id: string,
  ): Promise<LessonResponseDto> {
    const organizationId = this.getOrganizationId(session);
    const lesson = await this.findLesson(organizationId, id);

    return this.toLessonResponse(lesson);
  }

  async createLesson(
    session: OrganizationSession,
    dto: CreateLessonDto,
  ): Promise<LessonResponseDto> {
    const organizationId = this.getOrganizationId(session);
    const startsAt = new Date(dto.startsAt);

    if (startsAt.getTime() > Date.now()) {
      throw new BadRequestException('startsAt cannot be in the future');
    }

    const [student, teacher] = await Promise.all([
      this.prisma.student.findFirst({
        where: { id: dto.studentId, organizationId },
        select: { id: true, status: true },
      }),
      this.prisma.teacher.findFirst({
        where: { id: dto.teacherId, organizationId },
        select: { id: true, isActive: true, hourlyRate: true },
      }),
    ]);

    if (!student) {
      throw new BadRequestException('Student not found');
    }

    if (student.status === StudentStatus.ARCHIVED) {
      throw new BadRequestException('Student is archived');
    }

    if (!teacher) {
      throw new BadRequestException('Teacher not found');
    }

    if (!teacher.isActive) {
      throw new BadRequestException('Teacher is archived');
    }

    const lesson = await this.prisma.$transaction(async (tx) => {
      const subscriptionId = await this.deductLesson(tx, dto.studentId);

      const created = await tx.lesson.create({
        data: {
          organizationId,
          teacherId: teacher.id,
          startsAt,
          endsAt: new Date(startsAt.getTime() + dto.durationMin * MINUTE_MS),
          status: LessonStatus.COMPLETED,
          topic: dto.topic ?? null,
          homework: dto.homework ?? null,
          teacherRate: teacher.hourlyRate,
          teacherPay: calculateTeacherPay(teacher.hourlyRate, dto.durationMin),
          completedAt: new Date(),
          participants: {
            create: {
              organizationId,
              studentId: dto.studentId,
              attendance: AttendanceStatus.ATTENDED,
            },
          },
        },
      });

      await tx.subscriptionUsage.create({
        data: {
          organizationId,
          subscriptionId,
          studentId: dto.studentId,
          lessonId: created.id,
          type: SubscriptionUsageType.LESSON,
          lessonsDelta: -1,
          createdByUserId: session.user.id,
        },
      });

      return tx.lesson.findUniqueOrThrow({
        where: { id: created.id },
        include: lessonInclude,
      });
    });

    return this.toLessonResponse(lesson);
  }

  async cancelLesson(
    session: OrganizationSession,
    id: string,
    dto: CancelLessonDto,
  ): Promise<LessonResponseDto> {
    const organizationId = this.getOrganizationId(session);
    await this.findLesson(organizationId, id);

    const canceled = await this.prisma.$transaction(async (tx) => {
      const { count } = await tx.lesson.updateMany({
        where: { id, organizationId, status: LessonStatus.COMPLETED },
        data: {
          status: LessonStatus.CANCELED,
          cancelReason: dto.reason ?? null,
        },
      });

      if (count === 0) {
        throw new ConflictException('Only held lessons can be canceled');
      }

      // Возвращаем занятие в те пакеты, из которых оно было списано
      const usages = await tx.subscriptionUsage.findMany({
        where: { lessonId: id, type: SubscriptionUsageType.LESSON },
        select: { subscriptionId: true, studentId: true },
      });

      for (const usage of usages) {
        const { count: restored } = await tx.studentSubscription.updateMany({
          where: {
            id: usage.subscriptionId,
            status: { not: SubscriptionStatus.CANCELED },
          },
          data: {
            lessonsLeft: { increment: 1 },
            status: SubscriptionStatus.ACTIVE,
          },
        });

        if (restored === 0) {
          continue;
        }

        // lessonId не указываем: пара (lessonId, studentId) уже занята списанием
        await tx.subscriptionUsage.create({
          data: {
            organizationId,
            subscriptionId: usage.subscriptionId,
            studentId: usage.studentId,
            type: SubscriptionUsageType.ADJUSTMENT,
            lessonsDelta: 1,
            comment: `Отмена занятия ${id}`,
            createdByUserId: session.user.id,
          },
        });
      }

      return tx.lesson.findUniqueOrThrow({
        where: { id },
        include: lessonInclude,
      });
    });

    return this.toLessonResponse(canceled);
  }

  /**
   * Списывает одно занятие с самого раннего активного пакета ученика (FIFO).
   */
  private async deductLesson(
    tx: Prisma.TransactionClient,
    studentId: string,
  ): Promise<string> {
    const subscription = await tx.studentSubscription.findFirst({
      where: {
        studentId,
        status: SubscriptionStatus.ACTIVE,
        lessonsLeft: { gt: 0 },
      },
      orderBy: [{ purchasedOn: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
      select: { id: true },
    });

    if (!subscription) {
      throw this.noLessonsLeftException();
    }

    // Условие lessonsLeft > 0 защищает от параллельного списания последнего занятия
    const { count } = await tx.studentSubscription.updateMany({
      where: {
        id: subscription.id,
        status: SubscriptionStatus.ACTIVE,
        lessonsLeft: { gt: 0 },
      },
      data: { lessonsLeft: { decrement: 1 } },
    });

    if (count === 0) {
      throw this.noLessonsLeftException();
    }

    await tx.studentSubscription.updateMany({
      where: { id: subscription.id, lessonsLeft: 0 },
      data: { status: SubscriptionStatus.EXHAUSTED },
    });

    return subscription.id;
  }

  private async findLesson(
    organizationId: string,
    id: string,
  ): Promise<LessonWithRelations> {
    const lesson = await this.prisma.lesson.findFirst({
      where: { id, organizationId },
      include: lessonInclude,
    });

    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }

    return lesson;
  }

  private noLessonsLeftException(): ConflictException {
    return new ConflictException('Student has no paid lessons left');
  }

  private nextDay(date: string): string {
    const next = new Date(`${date}T00:00:00.000Z`);
    next.setUTCDate(next.getUTCDate() + 1);

    return next.toISOString().slice(0, 10);
  }

  // Полночь даты в указанном часовом поясе, переведённая в UTC
  private startOfDay(date: string, timezone: string): Date {
    const utcMidnight = new Date(`${date}T00:00:00.000Z`);
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).formatToParts(utcMidnight);
    const get = (type: string) =>
      Number(parts.find((part) => part.type === type)?.value);
    const zoned = Date.UTC(
      get('year'),
      get('month') - 1,
      get('day'),
      get('hour'),
      get('minute'),
    );

    return new Date(utcMidnight.getTime() - (zoned - utcMidnight.getTime()));
  }

  private getOrganizationId(session: OrganizationSession): string {
    const organizationId = session.session.activeOrganizationId;

    if (!organizationId) {
      throw new BadRequestException('Active organization is required');
    }

    return organizationId;
  }

  private toLessonResponse(lesson: LessonWithRelations): LessonResponseDto {
    return {
      id: lesson.id,
      startsAt: lesson.startsAt.toISOString(),
      durationMin: Math.round(
        (lesson.endsAt.getTime() - lesson.startsAt.getTime()) / MINUTE_MS,
      ),
      status: lesson.status,
      student: lesson.participants[0]?.student ?? null,
      teacher: lesson.teacher,
      teacherRate: lesson.teacherRate?.toFixed(2) ?? null,
      teacherPay: lesson.teacherPay?.toFixed(2) ?? null,
      currency: lesson.organization.currency,
      topic: lesson.topic,
      homework: lesson.homework,
      cancelReason: lesson.cancelReason,
      createdAt: lesson.createdAt.toISOString(),
    };
  }
}
