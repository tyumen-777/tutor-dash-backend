import { z } from 'zod';

export const cancelLessonSchema = z
  .object({
    reason: z
      .preprocess(
        (value) =>
          typeof value === 'string' && value.trim() === '' ? undefined : value,
        z.string().trim().max(500).optional(),
      )
      .meta({
        description: 'Why the lesson is canceled.',
        example: 'Добавлено по ошибке',
      }),
  })
  .strict()
  .meta({
    id: 'CancelLessonRequest',
    description: 'Payload for canceling a held lesson.',
  });

export type CancelLessonDto = z.infer<typeof cancelLessonSchema>;
