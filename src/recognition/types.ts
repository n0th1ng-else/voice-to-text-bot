import { IAudioMetadata } from "music-metadata/lib/type";

export enum VoiceConverterProvider {
  Google = "GOOGLE",
  Aws = "AWS",
}

export abstract class VoiceConverter {
  public abstract transformToText(
    fileLink: string,
    fileId: number
  ): Promise<string>;
}

export interface VoiceConverterOptions {
  googleProjectId?: string;
  googleClientEmail?: string;
  googlePrivateKey?: string;
}

export class AudioFileData {
  constructor(
    private readonly buffer: Buffer,
    private readonly meta: IAudioMetadata
  ) {}

  public get plainBuffer(): string {
    return this.buffer.toString("base64");
  }

  public get sampleRate(): number | undefined {
    return this.meta.format.sampleRate;
  }

  public get numberOfChannels(): number | undefined {
    return this.meta.format.numberOfChannels;
  }
}

export enum LanguageCode {
  Ru = "ru-RU",
  En = "en-US",
}
