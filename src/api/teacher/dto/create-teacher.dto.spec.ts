import { describe, expect, it } from 'vitest';

import { createTeacherSchema } from './create-teacher.dto.js';

const validTeacher = {
  fullName: ' Иванова Мария Петровна ',
  email: ' Teacher@Example.COM ',
  phone: '+7 912 345-67-89',
  telegram: '@maria_teacher',
  hourlyRate: 1500,
  startedOn: '2026-10-01',
};

describe('createTeacherSchema', () => {
  it('normalizes teacher fields', () => {
    const result = createTeacherSchema.parse(validTeacher);

    expect(result).toEqual({
      fullName: 'Иванова Мария Петровна',
      email: 'teacher@example.com',
      phone: '+7 912 345-67-89',
      telegram: 'maria_teacher',
      hourlyRate: 1500,
      startedOn: '2026-10-01',
    });
  });

  it('accepts t.me links and string rates', () => {
    const result = createTeacherSchema.parse({
      ...validTeacher,
      telegram: 'https://t.me/maria_teacher',
      hourlyRate: '1250.50',
    });

    expect(result.telegram).toBe('maria_teacher');
    expect(result.hourlyRate).toBe(1250.5);
  });

  it('treats empty contacts as absent', () => {
    const result = createTeacherSchema.parse({
      ...validTeacher,
      email: '',
      phone: ' ',
      telegram: '',
    });

    expect(result.email).toBeUndefined();
    expect(result.phone).toBeUndefined();
    expect(result.telegram).toBeUndefined();
  });

  it.each([
    ['empty full name', { fullName: ' ' }],
    ['negative rate', { hourlyRate: -1 }],
    ['rate with 3 fraction digits', { hourlyRate: 10.555 }],
    ['invalid date', { startedOn: '2026-13-01' }],
    ['invalid telegram', { telegram: '@ab' }],
    ['invalid phone', { phone: 'call me' }],
  ])('rejects %s', (_, override) => {
    const result = createTeacherSchema.safeParse({
      ...validTeacher,
      ...override,
    });

    expect(result.success).toBe(false);
  });

  it('requires hourly rate and start date', () => {
    const result = createTeacherSchema.safeParse({ fullName: 'Иванов Иван' });

    expect(result.success).toBe(false);
  });
});
