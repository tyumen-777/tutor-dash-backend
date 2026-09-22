import { z } from 'zod';

export const createMessageSchema = z
  .object({
    message: z.string().min(1),
    priority: z.enum(['low', 'normal', 'high']).default('normal'),
  })
  .strict();

export type CreateMessageDto = z.infer<typeof createMessageSchema>;
