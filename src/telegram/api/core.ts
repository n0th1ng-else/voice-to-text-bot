import { z } from "zod";

export const TgChatId = z.number().brand<"ChatId">();

export type ChatId = z.infer<typeof TgChatId>;

export const TgMessageId = z.number().brand<"MessageId">();

export type MessageId = z.infer<typeof TgMessageId>;
