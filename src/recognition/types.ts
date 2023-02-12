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
    fileId: string,
    isVideo: boolean,
    lang: LanguageCode
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

export enum LanguageCode {
  Ru = "ru-RU",
  En = "en-US",
}
