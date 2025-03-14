import { z } from "zod";

export const TgChatId = z.number().brand<"ChatId">();

export type ChatId = z.infer<typeof TgChatId>;
