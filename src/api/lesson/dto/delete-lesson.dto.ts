import { z } from 'zod';

export const deleteLessonSchema = z
  .object({
    reason: z.string().trim().min(3).max(500).meta({
      description: 'Why the lesson is deleted.',
      example: 'Внесено дважды',
    }),
  })
  .strict()
  .meta({
    id: 'DeleteLessonRequest',
    description: 'Payload for deleting a lesson registered by mistake.',
  });

export type DeleteLessonDto = z.infer<typeof deleteLessonSchema>;
