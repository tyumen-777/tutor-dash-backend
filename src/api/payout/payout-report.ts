import { Prisma } from '../../generated/prisma/client.js';

export type PayGroup = {
  teacherId: string;
  pay: Prisma.Decimal | null;
  count: number;
};

export type PayoutTeacher = {
  id: string;
  fullName: string;
  isActive: boolean;
};

const ZERO = new Prisma.Decimal(0);

/**
 * Строки отчёта о выплатах: начислено за период, сколько из этого уже
 * выплачено, остаток к выплате и невыплаченное до начала периода.
 * Преподаватели без занятий в периоде и без старых долгов не попадают.
 */
export function buildPayoutRows(
  teachers: PayoutTeacher[],
  period: PayGroup[],
  unpaid: PayGroup[],
  unpaidBefore: PayGroup[],
) {
  const byTeacher = (groups: PayGroup[]) =>
    new Map(groups.map((group) => [group.teacherId, group]));
  const periodByTeacher = byTeacher(period);
  const unpaidByTeacher = byTeacher(unpaid);
  const beforeByTeacher = byTeacher(unpaidBefore);

  return teachers
    .map((teacher) => {
      const accrued = periodByTeacher.get(teacher.id);
      const due = unpaidByTeacher.get(teacher.id);
      const dueBefore = beforeByTeacher.get(teacher.id)?.pay ?? ZERO;
      const accruedPay = accrued?.pay ?? ZERO;
      const duePay = due?.pay ?? ZERO;

      return {
        ...teacher,
        lessonsCount: accrued?.count ?? 0,
        unpaidLessonsCount: due?.count ?? 0,
        accrued: accruedPay,
        paid: accruedPay.minus(duePay),
        due: duePay,
        dueBefore,
      };
    })
    .filter((row) => row.lessonsCount > 0 || row.dueBefore.gt(0))
    .sort(
      (a, b) =>
        b.due.plus(b.dueBefore).comparedTo(a.due.plus(a.dueBefore)) ||
        a.fullName.localeCompare(b.fullName, 'ru'),
    );
}
