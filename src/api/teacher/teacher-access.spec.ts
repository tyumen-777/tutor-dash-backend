import { describe, expect, it, vi } from 'vitest';

import type { Prisma } from '../../generated/prisma/client.js';
import { inviteTeacherSchema } from './dto/teacher-access.dto.js';
import { parseMemberRoles, revokeTeacherAccess } from './teacher-access.js';

function createTx(member: { role: string } | null) {
  return {
    invitation: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
    member: {
      findUnique: vi
        .fn()
        .mockResolvedValue(
          member ? { id: 'member-1', userId: 'user-1', ...member } : null,
        ),
      delete: vi.fn().mockResolvedValue({}),
    },
    session: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
    teacher: { update: vi.fn().mockResolvedValue({}) },
  };
}

const asTx = (tx: ReturnType<typeof createTx>) =>
  tx as unknown as Prisma.TransactionClient;

describe('parseMemberRoles', () => {
  it('splits comma-separated roles', () => {
    expect(parseMemberRoles('owner, teacher')).toEqual(['owner', 'teacher']);
  });
});

describe('revokeTeacherAccess', () => {
  it('cancels pending invitations when the teacher has no account', async () => {
    const tx = createTx(null);

    await revokeTeacherAccess(asTx(tx), 'org-1', {
      id: 'teacher-1',
      memberId: null,
    });

    expect(tx.invitation.updateMany).toHaveBeenCalledWith({
      where: {
        organizationId: 'org-1',
        teacherId: 'teacher-1',
        status: 'pending',
      },
      data: { status: 'canceled' },
    });
    expect(tx.member.findUnique).not.toHaveBeenCalled();
  });

  it('removes a teacher-only member from the school and its active sessions', async () => {
    const tx = createTx({ role: 'teacher' });

    await revokeTeacherAccess(asTx(tx), 'org-1', {
      id: 'teacher-1',
      memberId: 'member-1',
    });

    expect(tx.member.delete).toHaveBeenCalledWith({
      where: { id: 'member-1' },
    });
    expect(tx.session.updateMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', activeOrganizationId: 'org-1' },
      data: { activeOrganizationId: null },
    });
    expect(tx.teacher.update).not.toHaveBeenCalled();
  });

  it('only unlinks an owner who also teaches', async () => {
    const tx = createTx({ role: 'owner' });

    await revokeTeacherAccess(asTx(tx), 'org-1', {
      id: 'teacher-1',
      memberId: 'member-1',
    });

    expect(tx.member.delete).not.toHaveBeenCalled();
    expect(tx.teacher.update).toHaveBeenCalledWith({
      where: { id: 'teacher-1' },
      data: { memberId: null },
    });
  });
});

describe('inviteTeacherSchema', () => {
  it('accepts an empty body', () => {
    expect(inviteTeacherSchema.parse(undefined)).toEqual({});
  });

  it('normalizes the email', () => {
    expect(inviteTeacherSchema.parse({ email: ' Anna@Example.com ' })).toEqual({
      email: 'anna@example.com',
    });
  });

  it('rejects unknown fields', () => {
    expect(() =>
      inviteTeacherSchema.parse({ email: 'a@b.co', role: 'admin' }),
    ).toThrow();
  });
});
