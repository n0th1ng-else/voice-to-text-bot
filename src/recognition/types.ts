export enum VoiceConverterProvider {
  Google = "GOOGLE",
  Aws = "AWS",
}

export abstract class VoiceConverter {
  public abstract transformToText(
    fileLink: string,
    fileId: string,
    lang: LanguageCode
  ): Promise<string>;
}

export interface VoiceConverterOptions {
  googleProjectId?: string;
  googleClientEmail?: string;
  googlePrivateKey?: string;
}

export enum LanguageCode {
  Ru = "ru-RU",
  En = "en-US",
}
