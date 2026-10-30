import { z } from 'zod';

export const studyLevelCodeSchema = z.string().trim().min(1).max(20).meta({
  description: 'Short level code, unique within the school.',
  example: 'A1',
});

export const studyLevelNameSchema = z.string().trim().min(1).max(100).meta({
  description: 'Level name.',
  example: 'Beginner',
});

export const createStudyLevelSchema = z
  .object({
    code: studyLevelCodeSchema,
    name: studyLevelNameSchema,
  })
  .strict()
  .meta({
    id: 'CreateStudyLevelRequest',
    description: 'Payload for adding a study level to the active organization.',
  });

export type CreateStudyLevelDto = z.infer<typeof createStudyLevelSchema>;
