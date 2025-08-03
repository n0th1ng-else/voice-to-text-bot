import { z } from "zod";
import type { Prettify } from "../../../../common/types.js";

export const TgWebHookSchema = z
  .object({
    url: z.string(),
  })
  .describe("Telegram web hook schema");

export type TgWebHook = Prettify<z.infer<typeof TgWebHookSchema>>;

export const TgSetWebHookSchema = z
  .boolean()
  .describe("Telegram webhook api response schema validator");

const BotCommandSchema = z
  .object({
    command: z.string(),
    description: z.string(),
  })
  .describe("Telegram bot command schema");

export type BotCommandDto = z.infer<typeof BotCommandSchema>;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const BotCommandListSchema = z
  .object({
    commands: z.array(BotCommandSchema),
  })
  .describe("Telegram bot command list schema");

export type BotCommandListDto = z.infer<typeof BotCommandListSchema>;

export const TgAnswerSetCommands = z
  .boolean()
  .describe("Telegram answer on bot set commands");
