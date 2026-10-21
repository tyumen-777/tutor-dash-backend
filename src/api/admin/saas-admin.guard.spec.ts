import { ForbiddenException, type ExecutionContext } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { SaasAdminGuard } from './saas-admin.guard.js';

const contextFor = (user: { id: string } | null) =>
  ({
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  }) as unknown as ExecutionContext;

const guardWith = (users: Record<string, { isSaasAdmin: boolean }>) =>
  new SaasAdminGuard({
    user: {
      findUnique: ({ where }: { where: { id: string } }) =>
        Promise.resolve(users[where.id] ?? null),
    },
  } as never);

describe('SaasAdminGuard', () => {
  it('allows users with the SaaS admin flag', async () => {
    const guard = guardWith({ admin: { isSaasAdmin: true } });

    await expect(guard.canActivate(contextFor({ id: 'admin' }))).resolves.toBe(
      true,
    );
  });

  it('rejects users without the flag', async () => {
    const guard = guardWith({ owner: { isSaasAdmin: false } });

    await expect(
      guard.canActivate(contextFor({ id: 'owner' })),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects requests without a user', async () => {
    const guard = guardWith({});

    await expect(guard.canActivate(contextFor(null))).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});
