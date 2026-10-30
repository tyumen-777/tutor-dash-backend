import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma } from '../../generated/prisma/client.js';
import {
  PaymentStatus,
  StudentStatus,
  SubscriptionStatus,
} from '../../generated/prisma/enums.js';
import { PrismaService } from '../../infra/prisma/prisma.service.js';
import type { CreateStudentDto } from './dto/create-student.dto.js';
import type { ListStudentsQueryDto } from './dto/list-students-query.dto.js';
import type { UpdateStudentDto } from './dto/update-student.dto.js';
import type {
  StudentBalanceResponseDto,
  StudentListResponseDto,
  StudentResponseDto,
} from './dto/student-response.dto.js';

type OrganizationSession = {
  session: { activeOrganizationId?: string | null };
};

const studentInclude = {
  teacher: { select: { id: true, fullName: true, isActive: true } },
  level: { select: { id: true, code: true, name: true } },
} satisfies Prisma.StudentInclude;

type StudentWithTeacher = Prisma.StudentGetPayload<{
  include: typeof studentInclude;
}>;

@Injectable()
export class StudentsService {
  constructor(private readonly prisma: PrismaService) {}

  async listStudents(
    session: OrganizationSession,
    query: ListStudentsQueryDto,
  ): Promise<StudentListResponseDto> {
    const organizationId = this.getOrganizationId(session);
    const where: Prisma.StudentWhereInput = { organizationId };

    if (!query.status) {
      where.status = { not: StudentStatus.ARCHIVED };
    } else if (query.status !== 'ALL') {
      where.status = query.status;
    }

    if (query.search) {
      const contains = { contains: query.search, mode: 'insensitive' as const };
      where.OR = [
        { firstName: contains },
        { lastName: contains },
        { email: contains },
        { phone: contains },
        { telegram: contains },
      ];
    }

    if (query.teacherId) {
      where.teacherId = query.teacherId;
    }

    const [students, total] = await this.prisma.$transaction([
      this.prisma.student.findMany({
        where,
        orderBy: [
          { lastName: { sort: 'asc', nulls: 'last' } },
          { firstName: 'asc' },
          { id: 'asc' },
        ],
        take: query.limit,
        skip: query.offset,
        include: studentInclude,
      }),
      this.prisma.student.count({ where }),
    ]);

    const lessonsLeft = await this.getLessonsLeft(
      students.map((student) => student.id),
    );

    return {
      items: students.map((student) =>
        this.toStudentResponse(student, lessonsLeft.get(student.id) ?? 0),
      ),
      total,
      limit: query.limit,
      offset: query.offset,
    };
  }

  async getStudent(
    session: OrganizationSession,
    id: string,
  ): Promise<StudentResponseDto> {
    const organizationId = this.getOrganizationId(session);
    const student = await this.findStudent(organizationId, id, studentInclude);
    const lessonsLeft = await this.getLessonsLeft([student.id]);

    return this.toStudentResponse(student, lessonsLeft.get(student.id) ?? 0);
  }

  async getStudentBalance(
    session: OrganizationSession,
    id: string,
  ): Promise<StudentBalanceResponseDto> {
    const organizationId = this.getOrganizationId(session);
    await this.findStudent(organizationId, id);

    const [packages, lastPayment] = await this.prisma.$transaction([
      this.prisma.studentSubscription.aggregate({
        where: { studentId: id, status: { not: SubscriptionStatus.CANCELED } },
        _sum: { lessonsTotal: true, lessonsLeft: true },
      }),
      this.prisma.payment.findFirst({
        where: { studentId: id, status: PaymentStatus.COMPLETED },
        orderBy: [{ paidAt: 'desc' }, { createdAt: 'desc' }],
        select: { paidAt: true },
      }),
    ]);

    const lessonsTotal = packages._sum.lessonsTotal ?? 0;
    const lessonsLeft = packages._sum.lessonsLeft ?? 0;

    return {
      lessonsTotal,
      lessonsUsed: lessonsTotal - lessonsLeft,
      lessonsLeft,
      lastPaidOn: lastPayment ? this.formatDate(lastPayment.paidAt) : null,
    };
  }

  async createStudent(
    session: OrganizationSession,
    dto: CreateStudentDto,
  ): Promise<StudentResponseDto> {
    const organizationId = this.getOrganizationId(session);

    if (dto.teacherId) {
      await this.assertActiveTeacher(organizationId, dto.teacherId);
    }

    if (dto.levelId) {
      await this.assertStudyLevel(organizationId, dto.levelId);
    }

    const student = await this.prisma.student.create({
      data: {
        organizationId,
        teacherId: dto.teacherId ?? null,
        firstName: dto.firstName,
        lastName: dto.lastName ?? null,
        email: dto.email ?? null,
        phone: dto.phone ?? null,
        telegram: dto.telegram ?? null,
        levelId: dto.levelId ?? null,
        birthDate: dto.birthDate ? this.parseDate(dto.birthDate) : null,
        timezone: dto.timezone ?? null,
        status: dto.status,
        note: dto.note ?? null,
      },
      include: studentInclude,
    });

    return this.toStudentResponse(student, 0);
  }

  async updateStudent(
    session: OrganizationSession,
    id: string,
    dto: UpdateStudentDto,
  ): Promise<StudentResponseDto> {
    const organizationId = this.getOrganizationId(session);
    const student = await this.findStudent(organizationId, id);

    if (
      dto.status !== undefined &&
      dto.status !== student.status &&
      student.status !== StudentStatus.LEAD &&
      student.status !== StudentStatus.ACTIVE
    ) {
      throw new ConflictException(
        'Only a lead or an active student can change status',
      );
    }

    // Уже назначенного преподавателя оставляем, даже если он в архиве
    if (dto.teacherId && dto.teacherId !== student.teacherId) {
      await this.assertActiveTeacher(organizationId, dto.teacherId);
    }

    if (dto.levelId && dto.levelId !== student.levelId) {
      await this.assertStudyLevel(organizationId, dto.levelId);
    }

    const data: Prisma.StudentUncheckedUpdateInput = {
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email,
      phone: dto.phone,
      telegram: dto.telegram,
      teacherId: dto.teacherId,
      levelId: dto.levelId,
      birthDate:
        dto.birthDate === undefined
          ? undefined
          : dto.birthDate && this.parseDate(dto.birthDate),
      timezone: dto.timezone,
      status: dto.status,
      note: dto.note,
    };

    try {
      const updated = await this.prisma.student.update({
        where: { id },
        data,
        include: studentInclude,
      });
      const lessonsLeft = await this.getLessonsLeft([updated.id]);

      return this.toStudentResponse(updated, lessonsLeft.get(updated.id) ?? 0);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Student not found');
      }

      throw error;
    }
  }

  async deleteStudent(session: OrganizationSession, id: string): Promise<void> {
    const organizationId = this.getOrganizationId(session);
    const student = await this.findStudent(organizationId, id, {
      _count: {
        select: {
          lessons: true,
          subscriptions: true,
          usages: true,
          payments: true,
        },
      },
    });

    const { lessons, subscriptions, usages, payments } = student._count;

    if (lessons + subscriptions + usages + payments > 0) {
      throw this.studentHasHistoryException();
    }

    try {
      // Шаблоны расписания и связи с родителями удаляются каскадно
      await this.prisma.student.delete({ where: { id } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        // Занятие или платёж могли появиться между проверкой и удалением
        if (error.code === 'P2003') {
          throw this.studentHasHistoryException();
        }

        if (error.code === 'P2025') {
          throw new NotFoundException('Student not found');
        }
      }

      throw error;
    }
  }

  private async findStudent<
    TInclude extends Prisma.StudentInclude = Record<never, never>,
  >(
    organizationId: string,
    id: string,
    include?: TInclude,
  ): Promise<Prisma.StudentGetPayload<{ include: TInclude }>> {
    const student = await this.prisma.student.findFirst({
      where: { id, organizationId },
      include,
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    return student as Prisma.StudentGetPayload<{ include: TInclude }>;
  }

  private async assertActiveTeacher(
    organizationId: string,
    teacherId: string,
  ): Promise<void> {
    const teacher = await this.prisma.teacher.findFirst({
      where: { id: teacherId, organizationId },
      select: { isActive: true },
    });

    if (!teacher) {
      throw new BadRequestException('Teacher not found');
    }

    if (!teacher.isActive) {
      throw new BadRequestException('Teacher is archived');
    }
  }

  private async assertStudyLevel(
    organizationId: string,
    levelId: string,
  ): Promise<void> {
    const level = await this.prisma.studyLevel.findFirst({
      where: { id: levelId, organizationId },
      select: { id: true },
    });

    if (!level) {
      throw new BadRequestException('Study level not found');
    }
  }

  private async getLessonsLeft(
    studentIds: string[],
  ): Promise<Map<string, number>> {
    if (studentIds.length === 0) {
      return new Map();
    }

    const balances = await this.prisma.studentSubscription.groupBy({
      by: ['studentId'],
      where: {
        studentId: { in: studentIds },
        status: { not: SubscriptionStatus.CANCELED },
      },
      _sum: { lessonsLeft: true },
    });

    return new Map(
      balances.map((balance) => [
        balance.studentId,
        balance._sum.lessonsLeft ?? 0,
      ]),
    );
  }

  private studentHasHistoryException(): ConflictException {
    return new ConflictException(
      'Student has lessons, subscriptions or payments and cannot be deleted; archive the student instead',
    );
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

  private toStudentResponse(
    student: StudentWithTeacher,
    lessonsLeft: number,
  ): StudentResponseDto {
    return {
      id: student.id,
      firstName: student.firstName,
      lastName: student.lastName,
      email: student.email,
      phone: student.phone,
      telegram: student.telegram,
      teacher: student.teacher,
      level: student.level,
      birthDate: student.birthDate ? this.formatDate(student.birthDate) : null,
      timezone: student.timezone,
      status: student.status,
      note: student.note,
      lessonsLeft,
      createdAt: student.createdAt.toISOString(),
    };
  }

  private formatDate(date: Date): string {
    return date.toISOString().slice(0, 10);
  }
}
