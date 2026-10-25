import { z } from 'zod';

const optionalText = <T extends z.ZodType>(schema: T) =>
  z.preprocess(
    (value) =>
      typeof value === 'string' && value.trim() === '' ? undefined : value,
    schema.optional(),
  );

export const lessonDurationSchema = z.coerce
  .number()
  .pipe(z.union([z.literal(45), z.literal(60)]))
  .meta({
    description: 'Lesson duration in minutes: 45 or 60.',
    example: 60,
  });

export const createLessonSchema = z
  .object({
    studentId: z.uuid().meta({
      description: 'ID of the student who attended the lesson.',
      example: '01929b3e-7c4a-7d2e-9f6b-1c2d3e4f5a6b',
    }),
    teacherId: z.uuid().meta({
      description: 'ID of the teacher who gave the lesson.',
      example: '01929b3e-7c4a-7d2e-9f6b-1c2d3e4f5a6c',
    }),
    startsAt: z.iso.datetime({ offset: true }).meta({
      description: 'Lesson start in ISO 8601 format. Cannot be in the future.',
      example: '2026-10-24T15:00:00.000Z',
    }),
    durationMin: lessonDurationSchema,
    topic: optionalText(
      z.string().trim().max(500).meta({
        description: 'Lesson topic.',
        example: 'Present Perfect',
      }),
    ),
    homework: optionalText(
      z.string().trim().max(2000).meta({
        description: 'Homework.',
        example: 'Workbook p. 12, ex. 3',
      }),
    ),
  })
  .strict()
  .meta({
    id: 'CreateLessonRequest',
    description:
      'Payload for registering a held lesson. Deducts one lesson from the student and credits the teacher.',
  });

export type CreateLessonDto = z.infer<typeof createLessonSchema>;
