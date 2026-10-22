import { describe, expect, it } from 'vitest';

import { createStudentSchema } from './create-student.dto.js';

const validStudent = {
  firstName: ' Анна ',
  lastName: ' Смирнова ',
  email: ' Student@Example.COM ',
  phone: '+7 912 345-67-89',
  telegram: '@anna_smirnova',
  teacherId: '01929b3e-7c4a-7d2e-9f6b-1c2d3e4f5a6b',
  level: ' B1 ',
  birthDate: '2012-05-14',
  timezone: 'Asia/Yekaterinburg',
  note: ' Готовится к ОГЭ ',
};

describe('createStudentSchema', () => {
  it('normalizes student fields and defaults status', () => {
    expect(createStudentSchema.parse(validStudent)).toEqual({
      firstName: 'Анна',
      lastName: 'Смирнова',
      email: 'student@example.com',
      phone: '+7 912 345-67-89',
      telegram: 'anna_smirnova',
      teacherId: '01929b3e-7c4a-7d2e-9f6b-1c2d3e4f5a6b',
      level: 'B1',
      birthDate: '2012-05-14',
      timezone: 'Asia/Yekaterinburg',
      status: 'ACTIVE',
      note: 'Готовится к ОГЭ',
    });
  });

  it('accepts only first name', () => {
    expect(createStudentSchema.parse({ firstName: 'Анна' })).toEqual({
      firstName: 'Анна',
      status: 'ACTIVE',
    });
  });

  it('treats empty optional fields as absent', () => {
    const result = createStudentSchema.parse({
      firstName: 'Анна',
      lastName: ' ',
      email: '',
      phone: '',
      telegram: '',
      teacherId: '',
      level: ' ',
      birthDate: '',
      timezone: '',
      note: '',
    });

    expect(result).toEqual({ firstName: 'Анна', status: 'ACTIVE' });
  });

  it('accepts t.me links for telegram', () => {
    expect(
      createStudentSchema.parse({
        firstName: 'Анна',
        telegram: 'https://t.me/anna_smirnova',
      }).telegram,
    ).toBe('anna_smirnova');
  });

  it('accepts LEAD status', () => {
    expect(
      createStudentSchema.parse({ firstName: 'Анна', status: 'LEAD' }).status,
    ).toBe('LEAD');
  });

  it.each([
    ['empty first name', { firstName: ' ' }],
    ['invalid email', { email: 'not-an-email' }],
    ['invalid phone', { phone: 'call me' }],
    ['invalid birth date', { birthDate: '14.05.2012' }],
    ['birth date in the future', { birthDate: '2999-01-01' }],
    ['invalid telegram', { telegram: '@ab' }],
    ['invalid teacher id', { teacherId: '42' }],
    ['too long level', { level: 'x'.repeat(51) }],
    ['unknown timezone', { timezone: 'Mars/Olympus' }],
    ['archived status', { status: 'ARCHIVED' }],
    ['unknown field', { userId: 'abc' }],
  ])('rejects %s', (_, override) => {
    expect(
      createStudentSchema.safeParse({ ...validStudent, ...override }).success,
    ).toBe(false);
  });
});
