import { ForbiddenException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import type { PrismaService } from '../../infra/prisma/prisma.service.js';
import { resolveTeacherScope } from './teacher-scope.js';

const session = { user: { id: 'user-1' }, session: {} };

function prismaWith(
  member: {
    role: string;
    teacherProfile: { id: string; isActive: boolean } | null;
  } | null,
) {
  return {
    member: { findUnique: vi.fn().mockResolvedValue(member) },
  } as unknown as PrismaService;
}

describe('resolveTeacherScope', () => {
  it('does not limit school-wide roles', async () => {
    for (const role of ['owner', 'admin', 'manager', 'accountant']) {
      await expect(
        resolveTeacherScope(
          prismaWith({ role, teacherProfile: null }),
          'org-1',
          session,
        ),
      ).resolves.toBeNull();
    }
  });

  it('does not limit an owner who also teaches', async () => {
    await expect(
      resolveTeacherScope(
        prismaWith({
          role: 'owner,teacher',
          teacherProfile: { id: 't-1', isActive: true },
        }),
        'org-1',
        session,
      ),
    ).resolves.toBeNull();
  });

  it('limits a teacher to their own profile', async () => {
    await expect(
      resolveTeacherScope(
        prismaWith({
          role: 'teacher',
          teacherProfile: { id: 't-1', isActive: true },
        }),
        'org-1',
        session,
      ),
    ).resolves.toEqual({ teacherId: 't-1' });
  });

  it('forbids a teacher without a linked profile', async () => {
    await expect(
      resolveTeacherScope(
        prismaWith({ role: 'teacher', teacherProfile: null }),
        'org-1',
        session,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('forbids a teacher whose profile is archived', async () => {
    await expect(
      resolveTeacherScope(
        prismaWith({
          role: 'teacher',
          teacherProfile: { id: 't-1', isActive: false },
        }),
        'org-1',
        session,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('forbids a user who is not a member', async () => {
    await expect(
      resolveTeacherScope(prismaWith(null), 'org-1', session),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
