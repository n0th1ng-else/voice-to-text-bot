import { z } from "zod";
import { Logger } from "../logger/index.js";

const logger = new Logger("voice-converter");

export const VoiceConverterProviderSchema = z
  .union([
    z.literal("WITAI"),
    z.literal("AWS"),
    z.literal("GOOGLE"),
    z.literal("WHISPER"),
    z.literal("11LABS"),
    z.literal("API_SELF"),
  ])
  .describe("Validation schema for the Voice converter providers we support");

export type VoiceConverterProvider = z.infer<typeof VoiceConverterProviderSchema>;

export abstract class VoiceConverter {
  public readonly name: string;

  protected constructor(name: string) {
    this.name = name;
    logger.info(`Using ${Logger.y(name)}`);
  }

  public abstract transformToText(
    fileLink: string,
    fileDuration: number,
    lang: LanguageCode,
    logData: ConverterMeta,
    isLocalFile: boolean,
  ): Promise<string>;

  public async getStatus(): Promise<"ok" | "error"> {
    return "ok";
  }
}

export const LanguageSchema = z.enum(["en-US", "ru-RU"]).describe("Supported language codes");

export type LanguageCode = z.infer<typeof LanguageSchema>;

export type LanguageTokens = Record<LanguageCode, string>;

export const SUPPORTED_LANGUAGES = LanguageSchema.options;

export const DEFAULT_LANGUAGE: LanguageCode = "en-US";

export type ConverterMeta = {
  fileId: string;
  prefix: string;
};

export type ConverterType = "main" | "advanced";

export type VoiceConverters = Record<ConverterType, VoiceConverter>;

export type VoiceConvertersHealth = Record<
  ConverterType,
  { provider: string; state: "ok" | "error" }
>;
