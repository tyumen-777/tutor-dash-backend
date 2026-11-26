import { z } from 'zod';

export const studentTelegramLinkSchema = z
  .object({
    id: z.uuid().meta({ description: 'Connected chat ID.' }),
    username: z
      .string()
      .nullable()
      .meta({
        description: 'Telegram username without «@».',
        examples: ['ivan_petrov'],
      }),
    displayName: z
      .string()
      .nullable()
      .meta({
        description: 'Name from the Telegram profile.',
        examples: ['Иван Петров'],
      }),
    connectedAt: z.iso
      .datetime()
      .meta({ description: 'When the chat was connected.' }),
  })
  .meta({ id: 'StudentTelegramLink' });

export const studentTelegramResponseSchema = z
  .object({
    botEnabled: z.boolean().meta({
      description: 'Whether the Telegram bot is configured on the server.',
    }),
    links: z.array(studentTelegramLinkSchema),
  })
  .meta({
    id: 'StudentTelegramResponse',
    description: 'Telegram chats that receive notifications for the student.',
  });

export const studentTelegramInviteResponseSchema = z
  .object({
    url: z.url().meta({
      description:
        'One-time link t.me/<bot>?start=<token> to send to the student.',
      examples: ['https://t.me/tutorflow_bot?start=Zx8kQ2v1Lw9mN3pR5tY7uA0b'],
    }),
    expiresAt: z.iso.datetime().meta({ description: 'Link expiry time.' }),
  })
  .meta({ id: 'StudentTelegramInviteResponse' });

export type StudentTelegramResponseDto = z.infer<
  typeof studentTelegramResponseSchema
>;
export type StudentTelegramInviteResponseDto = z.infer<
  typeof studentTelegramInviteResponseSchema
>;
