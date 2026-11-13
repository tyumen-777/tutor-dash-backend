import { z } from 'zod';

const inviteTeacherBodySchema = z
  .object({
    email: z
      .string()
      .trim()
      .toLowerCase()
      .pipe(
        z.email().meta({
          description:
            'Email to send the invitation to. Defaults to the teacher email.',
          example: 'teacher@example.com',
        }),
      )
      .optional(),
  })
  .strict()
  .meta({
    id: 'InviteTeacherRequest',
    description: 'Payload for inviting a teacher into their personal cabinet.',
  });

// Тело необязательно: без него используется почта из карточки учителя
export const inviteTeacherSchema = z.preprocess(
  (value) => value ?? {},
  inviteTeacherBodySchema,
);

export type InviteTeacherDto = z.infer<typeof inviteTeacherSchema>;

export const teacherAccessResponseSchema = z
  .object({
    status: z.enum(['none', 'invited', 'active']).meta({
      description:
        'none — no access, invited — invitation is pending, active — the teacher is linked to a user account.',
      example: 'invited',
    }),
    invitation: z
      .object({
        id: z.string().meta({
          description: 'Invitation ID; the accept link is /invite/{id}.',
          example: '3f1c2b7e-8a4d-4e2f-9b6a-1c2d3e4f5a6b',
        }),
        email: z.email().meta({
          description: 'Invited email.',
          example: 'teacher@example.com',
        }),
        expiresAt: z.iso.datetime().meta({
          description: 'Invitation expiration date.',
          example: '2026-11-20T12:00:00.000Z',
        }),
      })
      .nullable()
      .meta({ description: 'Pending invitation, if any.' }),
    user: z
      .object({
        id: z.string(),
        name: z.string(),
        email: z.email(),
      })
      .nullable()
      .meta({ description: 'Linked user account, if any.' }),
  })
  .meta({
    id: 'TeacherAccessResponse',
    description: 'Access of a teacher to their personal cabinet.',
  });

export type TeacherAccessResponseDto = z.infer<
  typeof teacherAccessResponseSchema
>;
