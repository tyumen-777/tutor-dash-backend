import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import type { Prisma, Teacher } from '../../generated/prisma/client.js';
import { PrismaService } from '../../infra/prisma/prisma.service.js';
import type { CreateTeacherDto } from './dto/create-teacher.dto.js';
import type { ListTeachersQueryDto } from './dto/list-teachers-query.dto.js';
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
    const teacher = await this.prisma.teacher.findFirst({
      where: { id, organizationId },
    });

    if (!teacher) {
      throw new NotFoundException('Teacher not found');
    }

    return this.toTeacherResponse(teacher);
  }

  async createTeacher(
    session: OrganizationSession,
    dto: CreateTeacherDto,
  ): Promise<TeacherResponseDto> {
    const organizationId = this.getOrganizationId(session);

    if (dto.email) {
      const existingTeacher = await this.prisma.teacher.findFirst({
        where: { organizationId, email: dto.email },
        select: { id: true },
      });

      if (existingTeacher) {
        throw new ConflictException(
          'Teacher with this email already exists in the organization',
        );
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
        startedOn: new Date(`${dto.startedOn}T00:00:00.000Z`),
      },
    });

    return this.toTeacherResponse(teacher);
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
      startedOn: teacher.startedOn.toISOString().slice(0, 10),
      isActive: teacher.isActive,
      createdAt: teacher.createdAt.toISOString(),
    };
  }
}
