import { describe, expect, it } from 'vitest';

import { updateStudentSchema } from './update-student.dto.js';

describe('updateStudentSchema', () => {
  it('accepts an empty payload', () => {
    expect(updateStudentSchema.parse({})).toEqual({});
  });

  it('normalizes changed fields', () => {
    expect(
      updateStudentSchema.parse({
        firstName: ' Анна ',
        email: ' Student@Example.COM ',
        telegram: 't.me/anna_smirnova',
        status: 'LEAD',
      }),
    ).toEqual({
      firstName: 'Анна',
      email: 'student@example.com',
      telegram: 'anna_smirnova',
      status: 'LEAD',
    });
  });

  it('clears optional fields with empty strings or null', () => {
    expect(
      updateStudentSchema.parse({
        lastName: ' ',
        email: '',
        phone: null,
        teacherId: '',
        birthDate: '',
        timezone: null,
        note: '',
      }),
    ).toEqual({
      lastName: null,
      email: null,
      phone: null,
      teacherId: null,
      birthDate: null,
      timezone: null,
      note: null,
    });
  });

  it.each([
    ['empty first name', { firstName: ' ' }],
    ['null first name', { firstName: null }],
    ['invalid email', { email: 'not-an-email' }],
    ['birth date in the future', { birthDate: '2999-01-01' }],
    ['archived status', { status: 'ARCHIVED' }],
    ['unknown field', { userId: 'abc' }],
  ])('rejects %s', (_, payload) => {
    expect(updateStudentSchema.safeParse(payload).success).toBe(false);
  });
});
