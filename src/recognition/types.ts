import { z } from "zod";

export const VoiceConverterProviderSchema = z
  .union([z.literal("WITAI"), z.literal("AWS"), z.literal("GOOGLE")])
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
    opts: ConverterMeta,
  ): Promise<string>;
}

export interface VoiceConverterOptions {
  isTestEnv?: boolean;
  googleProjectId?: string;
  googleClientEmail?: string;
  googlePrivateKey?: string;
  witAiTokenEn?: string;
  witAiTokenRu?: string;
}

export const LanguageSchema = z
  .union([z.literal("en-US"), z.literal("ru-RU")])
  .describe("Supported language codes");

export type LanguageCode = z.infer<typeof LanguageSchema>;

export const DEFAULT_LANGUAGE: LanguageCode = "en-US";

export interface ConverterMeta {
  fileId: string;
  prefix: string;
}
