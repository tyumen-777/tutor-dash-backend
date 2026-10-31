import { describe, expect, it } from 'vitest';

import { updateTeacherSchema } from './update-teacher.dto.js';

describe('updateTeacherSchema', () => {
  it('accepts an empty payload', () => {
    expect(updateTeacherSchema.parse({})).toEqual({});
  });

  it('normalizes changed fields', () => {
    expect(
      updateTeacherSchema.parse({
        fullName: ' Иванова Мария ',
        email: ' Teacher@Example.COM ',
        telegram: 't.me/maria_teacher',
        hourlyRate: '1250.50',
        startedOn: '2026-09-01',
      }),
    ).toEqual({
      fullName: 'Иванова Мария',
      email: 'teacher@example.com',
      telegram: 'maria_teacher',
      hourlyRate: 1250.5,
      startedOn: '2026-09-01',
    });
  });

  it('clears contacts with empty strings or null', () => {
    expect(
      updateTeacherSchema.parse({ email: '', phone: null, telegram: ' ' }),
    ).toEqual({ email: null, phone: null, telegram: null });
  });

  it.each([
    ['empty full name', { fullName: ' ' }],
    ['null full name', { fullName: null }],
    ['null hourly rate', { hourlyRate: null }],
    ['negative hourly rate', { hourlyRate: -1 }],
    ['invalid email', { email: 'not-an-email' }],
    ['invalid start date', { startedOn: '2026-13-01' }],
    ['unknown field', { isActive: false }],
  ])('rejects %s', (_, payload) => {
    expect(updateTeacherSchema.safeParse(payload).success).toBe(false);
  });
});
