import { z } from "zod";
import { Logger } from "../../logger/index.js";
import {
  type LanguageTokens,
  LanguageSchema,
  SUPPORTED_LANGUAGES,
} from "../types.js";

const logger = new Logger("wit-ai-recognition-utils");

const WitAiTokenItem = z
  .object({
    locale: LanguageSchema,
    token: z.string(),
  })
  .describe("Described the pair of locale and Wit.ai token");

const WitAiTokenItems = z.array(WitAiTokenItem);

const parseWitAILanguageTokens = (
  tokens: LanguageTokens,
  optionsStr?: string,
): LanguageTokens => {
  if (!optionsStr) {
    logger.warn("Wit.ai tokens v2 not found. Falling back to the old format");
    return tokens;
  }
  try {
    const options = WitAiTokenItems.parse(JSON.parse(optionsStr));
    const obj = options.reduce<LanguageTokens>((acc, item) => {
      return {
        ...acc,
        [item.locale]: item.token,
      };
    }, {} as LanguageTokens);

    return obj;
  } catch (err) {
    logger.error(
      "Failed to parse the wit.ai v2 tokens. Falling back to the old format",
      err,
    );
    return tokens;
  }
};

const validateWitAILanguageTokens = (tokens: LanguageTokens): void => {
  const missingTokens = SUPPORTED_LANGUAGES.filter((lang) => !tokens[lang]);
  if (missingTokens.length) {
    throw new Error(
      `wit.ai tokens are missing for languages: ${missingTokens.join(",")}`,
    );
  }
};

export const getWitAILanguageTokens = (
  tokens: LanguageTokens,
  optionsStr?: string,
): LanguageTokens => {
  const parsed = parseWitAILanguageTokens(tokens, optionsStr);
  validateWitAILanguageTokens(parsed);
  return parsed;
};
