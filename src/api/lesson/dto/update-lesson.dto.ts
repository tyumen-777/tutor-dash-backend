import { z } from 'zod';

import {
  lessonDurationSchema,
  lessonHomeworkSchema,
  lessonStartsAtSchema,
  lessonTeacherIdSchema,
  lessonTopicSchema,
} from './create-lesson.dto.js';

export const updateLessonSchema = z
  .object({
    teacherId: lessonTeacherIdSchema.optional(),
    startsAt: lessonStartsAtSchema.optional(),
    durationMin: lessonDurationSchema.optional(),
    // Пустая строка очищает тему
    topic: lessonTopicSchema.optional().meta({
      description: 'Lesson topic; an empty string clears it.',
      example: 'Present Perfect',
    }),
    // Пустая строка очищает домашнее задание
    homework: lessonHomeworkSchema.optional().meta({
      description: 'Homework; an empty string clears it.',
      example: 'Workbook p. 12, ex. 3',
    }),
  })
  .strict()
  .meta({
    id: 'UpdateLessonRequest',
    description:
      'Fields of a held lesson to change. The student cannot be changed: cancel the lesson and register a new one instead.',
  });

export type UpdateLessonDto = z.infer<typeof updateLessonSchema>;
