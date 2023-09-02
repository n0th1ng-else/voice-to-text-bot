import {
  type VoiceConverter,
  type VoiceConverterOptions,
  type VoiceConverterProvider,
  VoiceConverterProviderSchema,
} from "./types.js";
import { GoogleProvider } from "./google.js";
import { WithAiProvider } from "./witai/wit.ai.js";
import { AWSProvider } from "./aws.js";

export const getVoiceConverterProvider = (
  provider: string,
): VoiceConverterProvider => {
  return VoiceConverterProviderSchema.parse(provider);
};

export const getVoiceConverterInstance = (
  provider: VoiceConverterProvider,
  options: VoiceConverterOptions,
): VoiceConverter => {
  switch (provider) {
    case "GOOGLE":
      return new GoogleProvider(options);
    case "AWS":
      return new AWSProvider(options);
    case "WITAI":
      return new WithAiProvider(options);
    default:
      throw new Error("Voice recognition provider is not specified");
  }
};
