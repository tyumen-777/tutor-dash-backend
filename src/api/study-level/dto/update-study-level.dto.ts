import { z } from 'zod';

import {
  studyLevelCodeSchema,
  studyLevelNameSchema,
} from './create-study-level.dto.js';

export const updateStudyLevelSchema = z
  .object({
    code: studyLevelCodeSchema.optional(),
    name: studyLevelNameSchema.optional(),
  })
  .strict()
  .refine((dto) => dto.code !== undefined || dto.name !== undefined, {
    message: 'At least one field is required',
  })
  .meta({
    id: 'UpdateStudyLevelRequest',
    description: 'Study level fields to change.',
  });

export type UpdateStudyLevelDto = z.infer<typeof updateStudyLevelSchema>;
