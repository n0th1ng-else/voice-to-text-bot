import {
  type LanguageCode,
  type VoiceConverter,
  type VoiceConverterProvider,
  VoiceConverterProviderSchema,
} from "./types.js";
import { GoogleProvider } from "./google.js";
import { WithAiProvider } from "./witai/wit.ai.js";
import { AWSProvider } from "./aws.js";
import { WhisperProvider } from "./whisper.js";

// Subset of the env.js file
export type SupportedEnvironment = {
  witAiApi: {
    tokens: Record<LanguageCode, string>;
  };
  googleApi: {
    privateKey: string;
    projectId: string;
    clientEmail: string;
    isTestEnv?: boolean;
  };
};

export const getVoiceConverterProvider = (
  provider: string,
): VoiceConverterProvider => {
  return VoiceConverterProviderSchema.parse(provider);
};

export const getVoiceConverterInstance = async (
  provider: VoiceConverterProvider,
  environment: SupportedEnvironment,
): Promise<VoiceConverter> => {
  switch (provider) {
    case "GOOGLE":
      return new GoogleProvider({
        googlePrivateKey: environment.googleApi.privateKey,
        googleProjectId: environment.googleApi.projectId,
        googleClientEmail: environment.googleApi.clientEmail,
        isTestEnv: environment.googleApi.isTestEnv,
      });
    case "AWS":
      // TODO aws is not supported now
      return new AWSProvider({
        bucket: "",
        bucketRegion: "",
        poolId: "",
      });
    case "WITAI":
      return new WithAiProvider({
        tokens: environment.witAiApi.tokens,
      });
    case "WHISPER":
      return await WhisperProvider.factory();
    default:
      throw new Error("Voice recognition provider is not specified");
  }
};
