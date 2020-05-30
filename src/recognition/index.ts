import {
  VoiceConverter,
  VoiceConverterOptions,
  VoiceConverterProvider,
} from "./types";
import { GoogleProvider } from "./google";

const { AWSProvider } = require("./aws");

export function getVoiceConverterProvider(
  provider: string
): VoiceConverterProvider {
  switch (provider) {
    case VoiceConverterProvider.Aws:
      return VoiceConverterProvider.Aws;
    case VoiceConverterProvider.Google:
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
    default:
      throw new Error("Voice recognition provider is not specified");
  }
}
