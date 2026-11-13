import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Prisma } from '../../generated/prisma/client.js';
import { LessonStatus } from '../../generated/prisma/enums.js';
import type { PrismaService } from '../../infra/prisma/prisma.service.js';
import { LessonsService } from './lessons.service.js';

const OWN_TEACHER = '01929b3e-0000-7000-8000-000000000001';
const OTHER_TEACHER = '01929b3e-0000-7000-8000-000000000002';
const STUDENT = '01929b3e-0000-7000-8000-000000000003';

const session = {
  user: { id: 'user-1' },
  session: { activeOrganizationId: 'org-1' },
};

const startsAt = new Date('2026-11-10T10:00:00.000Z');

function createPrisma() {
  return {
    member: {
      findUnique: vi.fn().mockResolvedValue({
        role: 'teacher',
        teacherProfile: { id: OWN_TEACHER, isActive: true },
      }),
    },
    organization: {
      findUniqueOrThrow: vi.fn().mockResolvedValue({ timezone: 'UTC' }),
    },
    student: {
      findFirst: vi.fn().mockResolvedValue({
        id: STUDENT,
        status: 'ACTIVE',
        teacherId: OTHER_TEACHER,
      }),
    },
    teacher: {
      findFirst: vi.fn().mockResolvedValue({
        id: OWN_TEACHER,
        isActive: true,
        hourlyRate: new Prisma.Decimal(1000),
      }),
    },
    lesson: {
      findFirst: vi.fn(),
      findMany: vi.fn().mockReturnValue('findMany'),
      count: vi.fn().mockReturnValue('count'),
      aggregate: vi.fn().mockReturnValue('aggregate'),
    },
    $transaction: vi.fn(),
  };
}

describe('LessonsService for a teacher', () => {
  let prisma: ReturnType<typeof createPrisma>;
  let service: LessonsService;

  beforeEach(() => {
    prisma = createPrisma();
    service = new LessonsService(prisma as unknown as PrismaService);
  });

  it('lists only own lessons whatever teacherId is requested', async () => {
    prisma.$transaction.mockResolvedValue([
      [],
      0,
      { _sum: { teacherPay: null }, _count: { _all: 0 } },
      0,
      0,
    ]);

    await service.listLessons(session, {
      teacherId: OTHER_TEACHER,
      limit: 20,
      offset: 0,
    } as never);

    expect(prisma.lesson.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ teacherId: OWN_TEACHER }),
      }),
    );
  });

  it('hides lessons of other teachers', async () => {
    prisma.lesson.findFirst.mockResolvedValue(null);

    await expect(service.getLesson(session, 'lesson-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.lesson.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ teacherId: OWN_TEACHER }),
      }),
    );
  });

  it('forbids registering a lesson for another teacher', async () => {
    await expect(
      service.createLesson(session, {
        studentId: STUDENT,
        teacherId: OTHER_TEACHER,
        startsAt: startsAt.toISOString(),
        durationMin: 60,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('forbids registering a lesson for a student of another teacher', async () => {
    await expect(
      service.createLesson(session, {
        studentId: STUDENT,
        teacherId: OWN_TEACHER,
        startsAt: startsAt.toISOString(),
        durationMin: 60,
      }),
    ).rejects.toThrow('Student is not assigned to this teacher');
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  describe('editing', () => {
    beforeEach(() => {
      prisma.lesson.findFirst.mockResolvedValue({
        id: 'lesson-1',
        teacherId: OWN_TEACHER,
        status: LessonStatus.COMPLETED,
        startsAt,
        endsAt: new Date(startsAt.getTime() + 60 * 60_000),
        teacherRate: new Prisma.Decimal(1000),
        payoutExpenseId: null,
      });
    });

    it('forbids changing the time', async () => {
      await expect(
        service.updateLesson(session, 'lesson-1', {
          startsAt: '2026-11-10T11:00:00.000Z',
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('forbids changing the duration', async () => {
      await expect(
        service.updateLesson(session, 'lesson-1', { durationMin: 45 }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('forbids handing the lesson to another teacher', async () => {
      await expect(
        service.updateLesson(session, 'lesson-1', {
          teacherId: OTHER_TEACHER,
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('allows topic and homework, also with unchanged other fields', async () => {
      prisma.$transaction.mockResolvedValue({ edited: true });
      vi.spyOn(
        service as unknown as { toLessonResponse: (l: unknown) => unknown },
        'toLessonResponse',
      ).mockImplementation((lesson) => lesson);

      await expect(
        service.updateLesson(session, 'lesson-1', {
          teacherId: OWN_TEACHER,
          startsAt: startsAt.toISOString(),
          durationMin: 60,
          topic: 'Present Perfect',
          homework: 'p. 12',
        }),
      ).resolves.toEqual({ edited: true });
    });
  });
});
