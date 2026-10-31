import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma, type Teacher } from '../../generated/prisma/client.js';
import { LessonStatus } from '../../generated/prisma/enums.js';
import { PrismaService } from '../../infra/prisma/prisma.service.js';
import type { ArchiveTeacherDto } from './dto/archive-teacher.dto.js';
import type { CreateTeacherDto } from './dto/create-teacher.dto.js';
import type { ListTeachersQueryDto } from './dto/list-teachers-query.dto.js';
import type { UpdateTeacherDto } from './dto/update-teacher.dto.js';
import type {
  TeacherListResponseDto,
  TeacherResponseDto,
} from './dto/teacher-response.dto.js';

type OrganizationSession = {
  session: { activeOrganizationId?: string | null };
};

@Injectable()
export class TeachersService {
  constructor(private readonly prisma: PrismaService) {}

  async listTeachers(
    session: OrganizationSession,
    query: ListTeachersQueryDto,
  ): Promise<TeacherListResponseDto> {
    const organizationId = this.getOrganizationId(session);
    const where: Prisma.TeacherWhereInput = { organizationId };

    if (query.status !== 'all') {
      where.isActive = query.status === 'active';
    }

    if (query.search) {
      const contains = { contains: query.search, mode: 'insensitive' as const };
      where.OR = [
        { fullName: contains },
        { email: contains },
        { phone: contains },
        { telegram: contains },
      ];
    }

    const [teachers, total] = await this.prisma.$transaction([
      this.prisma.teacher.findMany({
        where,
        orderBy: [{ fullName: 'asc' }, { id: 'asc' }],
        take: query.limit,
        skip: query.offset,
      }),
      this.prisma.teacher.count({ where }),
    ]);

    return {
      items: teachers.map((teacher) => this.toTeacherResponse(teacher)),
      total,
      limit: query.limit,
      offset: query.offset,
    };
  }

  async getTeacher(
    session: OrganizationSession,
    id: string,
  ): Promise<TeacherResponseDto> {
    const organizationId = this.getOrganizationId(session);
    const teacher = await this.findTeacher(organizationId, id);

    return this.toTeacherResponse(teacher);
  }

  async archiveTeacher(
    session: OrganizationSession,
    id: string,
    dto: ArchiveTeacherDto,
  ): Promise<TeacherResponseDto> {
    const organizationId = this.getOrganizationId(session);
    const teacher = await this.findTeacher(organizationId, id, {
      organization: { select: { timezone: true } },
    });

    if (!teacher.isActive) {
      throw new ConflictException('Teacher is already archived');
    }

    const now = new Date();
    const today = this.getLocalDate(now, teacher.organization.timezone);
    const endedOn = dto.endedOn ? this.parseDate(dto.endedOn) : today;

    if (endedOn > today) {
      throw new BadRequestException('endedOn cannot be in the future');
    }

    if (endedOn < teacher.startedOn) {
      throw new BadRequestException('endedOn cannot be earlier than startedOn');
    }

    const archivedTeacher = await this.prisma.$transaction(async (tx) => {
      const { count } = await tx.teacher.updateMany({
        where: { id, organizationId, isActive: true },
        data: { isActive: false, endedOn },
      });

      if (count === 0) {
        throw new ConflictException('Teacher is already archived');
      }

      // Прошедшие занятия остаются в истории, будущие отменяются
      await tx.lesson.updateMany({
        where: {
          teacherId: id,
          status: LessonStatus.SCHEDULED,
          startsAt: { gte: now },
        },
        data: {
          status: LessonStatus.CANCELED,
          cancelReason: 'Преподаватель переведён в архив',
        },
      });

      // Шаблоны, которые ещё не начали действовать, не нужны
      await tx.scheduleRule.deleteMany({
        where: { teacherId: id, validFrom: { gt: today } },
      });

      await tx.scheduleRule.updateMany({
        where: {
          teacherId: id,
          OR: [{ validTo: null }, { validTo: { gt: today } }],
        },
        data: { validTo: today },
      });

      return tx.teacher.findUniqueOrThrow({ where: { id } });
    });

    return this.toTeacherResponse(archivedTeacher);
  }

  async restoreTeacher(
    session: OrganizationSession,
    id: string,
  ): Promise<TeacherResponseDto> {
    const organizationId = this.getOrganizationId(session);
    const teacher = await this.findTeacher(organizationId, id);

    if (teacher.isActive) {
      throw new ConflictException('Teacher is not archived');
    }

    if (teacher.email) {
      const activeDuplicate = await this.prisma.teacher.findFirst({
        where: {
          organizationId,
          email: teacher.email,
          isActive: true,
          id: { not: id },
        },
        select: { id: true },
      });

      if (activeDuplicate) {
        throw new ConflictException(
          'Active teacher with this email already exists in the organization',
        );
      }
    }

    const { count } = await this.prisma.teacher.updateMany({
      where: { id, organizationId, isActive: false },
      data: { isActive: true, endedOn: null },
    });

    if (count === 0) {
      throw new ConflictException('Teacher is not archived');
    }

    return this.getTeacher(session, id);
  }

  async deleteTeacher(session: OrganizationSession, id: string): Promise<void> {
    const organizationId = this.getOrganizationId(session);
    const teacher = await this.findTeacher(organizationId, id, {
      _count: { select: { lessons: true, scheduleRules: true } },
    });

    if (teacher._count.lessons > 0 || teacher._count.scheduleRules > 0) {
      throw this.teacherHasHistoryException();
    }

    try {
      await this.prisma.teacher.delete({ where: { id } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        // Занятие могло появиться между проверкой и удалением
        if (error.code === 'P2003') {
          throw this.teacherHasHistoryException();
        }

        if (error.code === 'P2025') {
          throw new NotFoundException('Teacher not found');
        }
      }

      throw error;
    }
  }

  async createTeacher(
    session: OrganizationSession,
    dto: CreateTeacherDto,
  ): Promise<TeacherResponseDto> {
    const organizationId = this.getOrganizationId(session);

    if (dto.email) {
      const existingTeacher = await this.prisma.teacher.findFirst({
        where: { organizationId, email: dto.email },
        orderBy: { isActive: 'desc' },
        select: { id: true, isActive: true },
      });

      if (existingTeacher?.isActive) {
        throw new ConflictException(
          'Teacher with this email already exists in the organization',
        );
      }

      if (existingTeacher) {
        // Вернувшегося сотрудника восстанавливают, чтобы не потерять историю
        throw new ConflictException({
          statusCode: 409,
          error: 'Conflict',
          message:
            'Archived teacher with this email exists; restore the teacher instead',
          archivedTeacherId: existingTeacher.id,
        });
      }
    }

    const teacher = await this.prisma.teacher.create({
      data: {
        organizationId,
        fullName: dto.fullName,
        email: dto.email ?? null,
        phone: dto.phone ?? null,
        telegram: dto.telegram ?? null,
        hourlyRate: dto.hourlyRate.toFixed(2),
        startedOn: this.parseDate(dto.startedOn),
      },
    });

    return this.toTeacherResponse(teacher);
  }

  async updateTeacher(
    session: OrganizationSession,
    id: string,
    dto: UpdateTeacherDto,
  ): Promise<TeacherResponseDto> {
    const organizationId = this.getOrganizationId(session);
    const teacher = await this.findTeacher(organizationId, id);
    const startedOn = dto.startedOn ? this.parseDate(dto.startedOn) : undefined;

    if (startedOn && teacher.endedOn && startedOn > teacher.endedOn) {
      throw new BadRequestException('startedOn cannot be later than endedOn');
    }

    // Почта уникальна среди всех учителей, иначе восстановление из архива сломается
    if (dto.email && dto.email !== teacher.email) {
      const duplicate = await this.prisma.teacher.findFirst({
        where: { organizationId, email: dto.email, id: { not: id } },
        select: { id: true },
      });

      if (duplicate) {
        throw new ConflictException(
          'Teacher with this email already exists in the organization',
        );
      }
    }

    try {
      const updated = await this.prisma.teacher.update({
        where: { id },
        data: {
          fullName: dto.fullName,
          email: dto.email,
          phone: dto.phone,
          telegram: dto.telegram,
          // Ставка уже созданных занятий зафиксирована в Lesson.teacherRate
          hourlyRate: dto.hourlyRate?.toFixed(2),
          startedOn,
        },
      });

      return this.toTeacherResponse(updated);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Teacher not found');
      }

      throw error;
    }
  }

  private async findTeacher<
    TInclude extends Prisma.TeacherInclude = Record<never, never>,
  >(
    organizationId: string,
    id: string,
    include?: TInclude,
  ): Promise<Prisma.TeacherGetPayload<{ include: TInclude }>> {
    const teacher = await this.prisma.teacher.findFirst({
      where: { id, organizationId },
      include,
    });

    if (!teacher) {
      throw new NotFoundException('Teacher not found');
    }

    return teacher as Prisma.TeacherGetPayload<{ include: TInclude }>;
  }

  private teacherHasHistoryException(): ConflictException {
    return new ConflictException(
      'Teacher has lessons or schedule rules and cannot be deleted; archive the teacher instead',
    );
  }

  private parseDate(date: string): Date {
    return new Date(`${date}T00:00:00.000Z`);
  }

  // Календарная дата в timezone школы как значение для колонки date
  private getLocalDate(date: Date, timezone: string): Date {
    const localDate = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);

    return this.parseDate(localDate);
  }

  private getOrganizationId(session: OrganizationSession): string {
    const organizationId = session.session.activeOrganizationId;

    if (!organizationId) {
      throw new BadRequestException('Active organization is required');
    }

    return organizationId;
  }

  private toTeacherResponse(teacher: Teacher): TeacherResponseDto {
    return {
      id: teacher.id,
      fullName: teacher.fullName,
      email: teacher.email,
      phone: teacher.phone,
      telegram: teacher.telegram,
      hourlyRate: teacher.hourlyRate.toFixed(2),
      startedOn: this.formatDate(teacher.startedOn),
      endedOn: teacher.endedOn ? this.formatDate(teacher.endedOn) : null,
      isActive: teacher.isActive,
      createdAt: teacher.createdAt.toISOString(),
    };
  }

  private formatDate(date: Date): string {
    return date.toISOString().slice(0, 10);
  }
}
