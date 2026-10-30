import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../infra/prisma/prisma.service.js';
import type { CreateStudyLevelDto } from './dto/create-study-level.dto.js';
import type {
  StudyLevelListResponseDto,
  StudyLevelResponseDto,
} from './dto/study-level-response.dto.js';
import type { UpdateStudyLevelDto } from './dto/update-study-level.dto.js';

type OrganizationSession = {
  session: { activeOrganizationId?: string | null };
};

const studyLevelSelect = {
  id: true,
  code: true,
  name: true,
  _count: { select: { students: true } },
} satisfies Prisma.StudyLevelSelect;

type StudyLevelWithCount = Prisma.StudyLevelGetPayload<{
  select: typeof studyLevelSelect;
}>;

@Injectable()
export class StudyLevelsService {
  constructor(private readonly prisma: PrismaService) {}

  async listStudyLevels(
    session: OrganizationSession,
  ): Promise<StudyLevelListResponseDto> {
    const levels = await this.prisma.studyLevel.findMany({
      where: { organizationId: this.getOrganizationId(session) },
      orderBy: [{ code: 'asc' }, { id: 'asc' }],
      select: studyLevelSelect,
    });

    return { items: levels.map((level) => this.toResponse(level)) };
  }

  async createStudyLevel(
    session: OrganizationSession,
    dto: CreateStudyLevelDto,
  ): Promise<StudyLevelResponseDto> {
    const organizationId = this.getOrganizationId(session);

    try {
      const level = await this.prisma.studyLevel.create({
        data: { organizationId, code: dto.code, name: dto.name },
        select: studyLevelSelect,
      });

      return this.toResponse(level);
    } catch (error) {
      throw this.mapUniqueError(error);
    }
  }

  async updateStudyLevel(
    session: OrganizationSession,
    id: string,
    dto: UpdateStudyLevelDto,
  ): Promise<StudyLevelResponseDto> {
    const organizationId = this.getOrganizationId(session);
    await this.findStudyLevel(organizationId, id);

    try {
      const level = await this.prisma.studyLevel.update({
        where: { id },
        data: { code: dto.code, name: dto.name },
        select: studyLevelSelect,
      });

      return this.toResponse(level);
    } catch (error) {
      throw this.mapUniqueError(error);
    }
  }

  async deleteStudyLevel(
    session: OrganizationSession,
    id: string,
  ): Promise<void> {
    const organizationId = this.getOrganizationId(session);
    const level = await this.findStudyLevel(organizationId, id);

    if (level._count.students > 0) {
      throw this.levelInUseException();
    }

    try {
      await this.prisma.studyLevel.delete({ where: { id } });
    } catch (error) {
      // Ученик мог получить уровень между проверкой и удалением
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw this.levelInUseException();
      }

      throw error;
    }
  }

  private async findStudyLevel(
    organizationId: string,
    id: string,
  ): Promise<StudyLevelWithCount> {
    const level = await this.prisma.studyLevel.findFirst({
      where: { id, organizationId },
      select: studyLevelSelect,
    });

    if (!level) {
      throw new NotFoundException('Study level not found');
    }

    return level;
  }

  private mapUniqueError(error: unknown): unknown {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      return new ConflictException('Study level code already exists');
    }

    return error;
  }

  private levelInUseException(): ConflictException {
    return new ConflictException(
      'Study level is assigned to students and cannot be deleted',
    );
  }

  private getOrganizationId(session: OrganizationSession): string {
    const organizationId = session.session.activeOrganizationId;

    if (!organizationId) {
      throw new BadRequestException('Active organization is required');
    }

    return organizationId;
  }

  private toResponse(level: StudyLevelWithCount): StudyLevelResponseDto {
    return {
      id: level.id,
      code: level.code,
      name: level.name,
      studentsCount: level._count.students,
    };
  }
}
