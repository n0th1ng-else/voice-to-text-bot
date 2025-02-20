import { z } from "zod";
import { LanguageSchema } from "../types.js";

const WitAiTokenItem = z
  .object({
    locale: LanguageSchema,
    token: z.string(),
  })
  .describe("Described the pair of locale and Wit.ai token");

export const WitAiTokenItems = z.array(WitAiTokenItem);
