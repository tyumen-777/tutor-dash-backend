import { describe, expect, it, vi } from 'vitest';

import { assertPeriodsOpen } from './period-lock.js';

function createTx(locked: string | null, timezone = 'Europe/Moscow') {
  return {
    $queryRaw: vi.fn().mockResolvedValue([{ timezone }]),
    periodLock: {
      findFirst: vi
        .fn()
        .mockResolvedValue(
          locked ? { month: new Date(`${locked}-01T00:00:00.000Z`) } : null,
        ),
    },
  };
}

describe('assertPeriodsOpen', () => {
  it('passes when no month is closed', async () => {
    const tx = createTx(null);

    await expect(
      assertPeriodsOpen(tx as never, 'org-1', ['2026-11-10']),
    ).resolves.toBeUndefined();
    expect(tx.$queryRaw).toHaveBeenCalled();
  });

  it('rejects a date in a closed month', async () => {
    const tx = createTx('2026-10');

    await expect(
      assertPeriodsOpen(tx as never, 'org-1', ['2026-10-31', '2026-11-01']),
    ).rejects.toThrow('Period 2026-10 is closed');
    expect(tx.periodLock.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          organizationId: 'org-1',
          month: {
            in: [
              new Date('2026-10-01T00:00:00.000Z'),
              new Date('2026-11-01T00:00:00.000Z'),
            ],
          },
        },
      }),
    );
  });

  it('takes the month of a moment by the school clock', async () => {
    const tx = createTx(null);

    // 31.10 22:30 UTC — уже 1 ноября в Москве
    await assertPeriodsOpen(tx as never, 'org-1', [
      new Date('2026-10-31T22:30:00.000Z'),
    ]);

    expect(tx.periodLock.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          organizationId: 'org-1',
          month: { in: [new Date('2026-11-01T00:00:00.000Z')] },
        },
      }),
    );
  });
});
