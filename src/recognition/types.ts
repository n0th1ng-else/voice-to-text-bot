import { z } from "zod";

export const VoiceConverterProviderSchema = z
  .union([
    z.literal("WITAI"),
    z.literal("AWS"),
    z.literal("GOOGLE"),
    z.literal("WHISPER"),
  ])
  .catch("WITAI")
  .describe("Validation schema for the Voice converter providers we support");

export type VoiceConverterProvider = z.infer<
  typeof VoiceConverterProviderSchema
>;

export abstract class VoiceConverter {
  public abstract transformToText(
    fileLink: string,
    isVideo: boolean,
    lang: LanguageCode,
    logData: ConverterMeta,
  ): Promise<string>;
}

export const LanguageSchema = z
  .enum(["en-US", "ru-RU"])
  .describe("Supported language codes");

export type LanguageCode = z.infer<typeof LanguageSchema>;

export const SUPPORTED_LANGUAGES = LanguageSchema.options;

export const DEFAULT_LANGUAGE: LanguageCode = "en-US";

export type ConverterMeta = {
  fileId: string;
  prefix: string;
};
