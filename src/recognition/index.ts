import {
  VoiceConverter,
  VoiceConverterOptions,
  VoiceConverterProvider,
} from "./types";
import { GoogleProvider } from "./google";
import { WithAiProvider } from "./wit.ai";
import { AWSProvider } from "./aws";

export function getVoiceConverterProvider(
  provider: string
): VoiceConverterProvider {
  switch (provider) {
    case VoiceConverterProvider.Aws:
      return VoiceConverterProvider.Aws;
    case VoiceConverterProvider.WitAi:
      return VoiceConverterProvider.WitAi;
    case VoiceConverterProvider.Google:
      return VoiceConverterProvider.Google;
    default:
      return VoiceConverterProvider.Google;
  }
}

export function getVoiceConverterInstance(
  provider: VoiceConverterProvider,
  options: VoiceConverterOptions
): VoiceConverter {
  switch (provider) {
    case VoiceConverterProvider.Google:
      return new GoogleProvider(options);
    case VoiceConverterProvider.Aws:
      return new AWSProvider(options);
    case VoiceConverterProvider.WitAi:
      return new WithAiProvider(options);
    default:
      throw new Error("Voice recognition provider is not specified");
  }
}
