import { BadRequestException, ConflictException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import { LessonStatus, StudentStatus } from '../../generated/prisma/enums.js';
import type { PrismaService } from '../../infra/prisma/prisma.service.js';
import { PaymentsService } from '../payment/payments.service.js';
import { StudentsService } from './students.service.js';

const session = {
  user: { id: 'user-1' },
  session: { activeOrganizationId: 'org-1' },
};

function setup(status: StudentStatus, updated = 1) {
  const student = {
    id: 'st-1',
    organizationId: 'org-1',
    status,
    organization: { timezone: 'Europe/Moscow' },
  };
  const tx = {
    student: { updateMany: vi.fn().mockResolvedValue({ count: updated }) },
    lesson: { updateMany: vi.fn().mockResolvedValue({ count: 0 }) },
    scheduleRule: {
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      updateMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
  };
  const prisma = {
    student: {
      findFirst: vi.fn().mockResolvedValue(student),
      updateMany: vi.fn().mockResolvedValue({ count: updated }),
    },
    $transaction: vi.fn((callback: (client: typeof tx) => unknown) =>
      callback(tx),
    ),
  };
  const service = new StudentsService(prisma as unknown as PrismaService);
  const getStudent = vi
    .spyOn(service, 'getStudent')
    .mockResolvedValue({ id: 'st-1' } as never);

  return { service, prisma, tx, getStudent };
}

describe('StudentsService.archiveStudent', () => {
  it('archives the student and cancels only future scheduled lessons', async () => {
    const { service, tx } = setup(StudentStatus.PAUSED);

    await service.archiveStudent(session, 'st-1');

    expect(tx.student.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'st-1',
        organizationId: 'org-1',
        status: { not: StudentStatus.ARCHIVED },
      },
      data: { status: StudentStatus.ARCHIVED },
    });
    expect(tx.lesson.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: LessonStatus.SCHEDULED,
          participants: { some: { studentId: 'st-1' } },
        }),
      }),
    );
  });

  it('rejects an already archived student', async () => {
    const { service, tx } = setup(StudentStatus.ARCHIVED);

    await expect(service.archiveStudent(session, 'st-1')).rejects.toThrow(
      ConflictException,
    );
    expect(tx.student.updateMany).not.toHaveBeenCalled();
  });

  it('fails when the student was archived concurrently', async () => {
    const { service, tx } = setup(StudentStatus.ACTIVE, 0);

    await expect(service.archiveStudent(session, 'st-1')).rejects.toThrow(
      ConflictException,
    );
    expect(tx.lesson.updateMany).not.toHaveBeenCalled();
  });
});

describe('StudentsService.restoreStudent', () => {
  it('returns an archived student to active', async () => {
    const { service, prisma } = setup(StudentStatus.ARCHIVED);

    await service.restoreStudent(session, 'st-1');

    expect(prisma.student.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'st-1',
        organizationId: 'org-1',
        status: StudentStatus.ARCHIVED,
      },
      data: { status: StudentStatus.ACTIVE },
    });
  });

  it('rejects a student who is not archived', async () => {
    const { service } = setup(StudentStatus.ACTIVE, 0);

    await expect(service.restoreStudent(session, 'st-1')).rejects.toThrow(
      ConflictException,
    );
  });
});

describe('StudentsService.updateStudent status', () => {
  it('does not take a student out of the archive', async () => {
    const { service } = setup(StudentStatus.ARCHIVED);

    await expect(
      service.updateStudent(session, 'st-1', { status: 'ACTIVE' }),
    ).rejects.toThrow(ConflictException);
  });
});

describe('PaymentsService with an archived student', () => {
  it('rejects a payment', async () => {
    const prisma = {
      organization: {
        findUniqueOrThrow: vi
          .fn()
          .mockResolvedValue({ currency: 'RUB', timezone: 'Europe/Moscow' }),
      },
      student: {
        findFirst: vi
          .fn()
          .mockResolvedValue({ id: 'st-1', status: StudentStatus.ARCHIVED }),
      },
      $transaction: vi.fn(),
    };
    const service = new PaymentsService(prisma as unknown as PrismaService);

    await expect(
      service.createPayment(session, {
        studentId: 'st-1',
        amount: 8000,
        lessonsCount: 8,
        paidOn: '2026-11-01',
        method: 'CASH',
      }),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
