export enum VoiceConverterProvider {
  Google = "GOOGLE",
  Aws = "AWS",
  WitAi = "WITAI",
}

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
