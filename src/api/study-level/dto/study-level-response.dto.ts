import { z } from 'zod';

export const studyLevelResponseSchema = z
  .object({
    id: z.uuid().meta({
      description: 'Study level ID.',
      examples: ['01929b3e-7c4a-7d2e-9f6b-1c2d3e4f5a6b'],
    }),
    code: z.string().meta({
      description: 'Short level code.',
      examples: ['A1'],
    }),
    name: z.string().meta({
      description: 'Level name.',
      examples: ['Beginner'],
    }),
    studentsCount: z
      .number()
      .int()
      .meta({
        description: 'Students of any status with this level.',
        examples: [12],
      }),
  })
  .meta({
    id: 'StudyLevelResponse',
    description: 'Study level of the school.',
  });

export type StudyLevelResponseDto = z.infer<typeof studyLevelResponseSchema>;

export const studyLevelListResponseSchema = z
  .object({
    items: z.array(studyLevelResponseSchema),
  })
  .meta({
    id: 'StudyLevelListResponse',
    description: 'All study levels of the school ordered by code.',
  });

export type StudyLevelListResponseDto = z.infer<
  typeof studyLevelListResponseSchema
>;
