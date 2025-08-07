import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { type LanguageCode } from "../../recognition/types.js";
import { type TranslationKey, TranslationKeys } from "../types.js";
import { BotCommand, type BotCommandType } from "../../telegram/commands.js";

const getTranslationKeysSchema = () => {
  const values: string[] = Object.values(TranslationKeys);

  const translationKeysSchema: z.ZodEnum<Readonly<Record<string, string>>> = z
    .enum([values[0], ...values.slice(1)])
    .describe("Supported translation keys");

  return translationKeysSchema;
};

const createRequiredObjSchema = <V extends z.ZodTypeAny>(
  filename: string,
  keysSchema: z.ZodEnum<Readonly<Record<string, string>>>,
  valueSchema: V,
) => {
  return z.record(keysSchema, valueSchema).superRefine((obj, ctx) => {
    const missingKeys = keysSchema.options.filter((key) => !obj[key]);
    if (missingKeys.length) {
      ctx.addIssue({
        code: "custom",
        message: "Not all translation keys are implemented",
        path: [filename],
        params: {
          missingKeys,
        },
      });
    }
  });
};

const TRANSLATIONS_DIR = fileURLToPath(new URL("./bundles", import.meta.url));

const getTranslationsFileSchema = (filename: string) =>
  createRequiredObjSchema(
    filename,
    getTranslationKeysSchema(),
    z.optional(z.string()),
  );

const getTranslationFilename = (lang: string) => `translations.${lang}.json`;

export type TranslationsFileType = z.infer<
  ReturnType<typeof getTranslationsFileSchema>
>;

export const initializeMenuLabels = (): Record<BotCommandType, string> => {
  const labels: Record<BotCommandType, string> = {
    [BotCommand.Language]: "Switch the recognition language",
    [BotCommand.Support]: "Show support links",
    [BotCommand.Start]: "Say hello and see bot info",
    [BotCommand.Donate]: "Help us with funding the project",
  } as const;
  return labels;
};

export const initializeTranslationsForLocale = (
  lang: LanguageCode,
): TranslationsFileType => {
  const fullPath = resolve(TRANSLATIONS_DIR, getTranslationFilename(lang));
  if (!existsSync(fullPath)) {
    throw new Error(
      `the translations file does not exists for "${lang}" locale`,
      {
        cause: {
          translationFile: fullPath,
        },
      },
    );
  }
  const content = readFileSync(fullPath, { encoding: "utf-8" });
  const translations = getTranslationsFileSchema(fullPath).parse(
    JSON.parse(content),
  );
  return translations;
};

export const createTranslationsFileForLocale = (lang: string): void => {
  const fullPath = resolve(TRANSLATIONS_DIR, getTranslationFilename(lang));

  const oldContent = existsSync(fullPath)
    ? readFileSync(fullPath, { encoding: "utf-8" })
    : "{}";
  const data: Record<string, string> = JSON.parse(oldContent);

  const translationKeys = Object.values(TranslationKeys).sort((a, b) =>
    a.localeCompare(b),
  );
  const content = translationKeys.reduce<Partial<Record<TranslationKey, "">>>(
    (acc, key) => {
      return {
        ...acc,
        [key]: data[key] ?? "",
      };
    },
    {},
  );
  writeFileSync(fullPath, `${JSON.stringify(content, null, 2)}\n`);
};
