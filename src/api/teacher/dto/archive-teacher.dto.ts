import { z } from 'zod';

const archiveTeacherBodySchema = z
  .object({
    endedOn: z.iso.date().optional().meta({
      description:
        'Employment end date (YYYY-MM-DD). Defaults to today in the organization timezone.',
      example: '2026-10-20',
    }),
  })
  .strict()
  .meta({
    id: 'ArchiveTeacherRequest',
    description: 'Payload for moving a teacher to the archive.',
  });

// Тело необязательно: без него датой увольнения считается сегодня
export const archiveTeacherSchema = z.preprocess(
  (value) => value ?? {},
  archiveTeacherBodySchema,
);

export type ArchiveTeacherDto = z.infer<typeof archiveTeacherSchema>;
