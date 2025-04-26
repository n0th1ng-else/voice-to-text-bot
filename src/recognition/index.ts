import {
  type LanguageTokens,
  type VoiceConverter,
  type VoiceConverterProvider,
  type VoiceConverters,
} from "./types.js";
import { GoogleProvider } from "./google.js";
import { WithAiProvider } from "./witai/wit.ai.js";
import { AWSProvider } from "./aws.js";
import { WhisperProvider } from "./whisper.js";
import { ElevenLabsProvider } from "./elevenLabs.js";
import { getWitAILanguageTokens } from "./witai/parser.js";

// Subset of the env.js file
export type SupportedEnvironment = {
  elevenLabsKey: string;
  wtiAiTokens: string;
  witAiApi: {
    tokens: LanguageTokens;
  };
  googleApi: {
    privateKey: string;
    projectId: string;
    clientEmail: string;
    isTestEnv?: boolean;
  };
};

const getVoiceConverterInstance = async (
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
      return new WithAiProvider(
        getWitAILanguageTokens(
          environment.witAiApi.tokens,
          environment.wtiAiTokens,
        ),
      );
    case "WHISPER":
      return await WhisperProvider.factory();
    case "11LABS":
      return new ElevenLabsProvider({ apiToken: environment.elevenLabsKey });
    default:
      throw new Error("Voice recognition provider is not specified");
  }
};

export const getVoiceConverterInstances = async (
  basicProvider: VoiceConverterProvider,
  advancedProvider: VoiceConverterProvider,
  environment: SupportedEnvironment,
): Promise<VoiceConverters> => {
  return {
    basic: await getVoiceConverterInstance(basicProvider, environment),
    advanced: await getVoiceConverterInstance(advancedProvider, environment),
  };
};
