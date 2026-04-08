import {
  type LanguageTokens,
  type VoiceConverter,
  type VoiceConverterProvider,
  VoiceConverterProviderSchema,
  type VoiceConverters,
} from "./types.js";
import { getWitAILanguageTokens } from "./witai/parser.js";
import { VOICE_PROVIDERS } from "../const.js";

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
  selfApi: {
    apiToken: string;
    apiUrl: string;
    healthUrl: string;
    useRawFile: boolean;
  };
};

const getVoiceConverterInstance = async (
  provider: VoiceConverterProvider,
  environment: SupportedEnvironment,
): Promise<VoiceConverter> => {
  switch (provider) {
    case "GOOGLE":
      return import("./google.js").then(({ GoogleProvider }) => {
        return new GoogleProvider({
          googlePrivateKey: environment.googleApi.privateKey,
          googleProjectId: environment.googleApi.projectId,
          googleClientEmail: environment.googleApi.clientEmail,
          isTestEnv: environment.googleApi.isTestEnv,
        });
      });
    case "AWS":
      return import("./aws.js").then(({ AWSProvider }) => {
        // TODO aws is not supported now
        return new AWSProvider({
          bucket: "",
          bucketRegion: "",
          poolId: "",
        });
      });
    case "WITAI":
      return import("./witai/wit.ai.js").then(({ WithAiProvider }) => {
        return new WithAiProvider(
          getWitAILanguageTokens(environment.witAiApi.tokens, environment.wtiAiTokens),
        );
      });
    case "WHISPER":
      return import("./whisper.js").then(async ({ WhisperProvider }) => {
        return await WhisperProvider.factory();
      });
    case "11LABS":
      return import("./elevenLabs.js").then(({ ElevenLabsProvider }) => {
        return new ElevenLabsProvider({
          apiToken: environment.elevenLabsKey,
        });
      });
    case "API_SELF":
      return import("./apiSelfHost.js").then(({ ApiSelfHost }) => {
        return new ApiSelfHost(
          environment.selfApi.apiUrl,
          environment.selfApi.apiToken,
          environment.selfApi.useRawFile,
          environment.selfApi.healthUrl,
        );
      });
    default:
      throw new Error("Voice recognition provider is not specified");
  }
};

export const getVoiceConverterInstances = async (
  mainProvider: VoiceConverterProvider,
  advancedProvider: VoiceConverterProvider,
  environment: SupportedEnvironment,
): Promise<VoiceConverters> => {
  return {
    main: await getVoiceConverterInstance(mainProvider, environment),
    advanced: await getVoiceConverterInstance(advancedProvider, environment),
  };
};

const parseProvider = (
  provider: string,
  fallback: VoiceConverterProvider,
): VoiceConverterProvider => {
  try {
    const parsed = VoiceConverterProviderSchema.parse(provider);
    return parsed;
  } catch {
    return fallback;
  }
};

export const getVoiceProviders = (env: {
  main: string;
  advanced: string;
}): { main: VoiceConverterProvider; advanced: VoiceConverterProvider } => {
  return {
    main: parseProvider(env.main, VOICE_PROVIDERS.main),
    advanced: parseProvider(env.advanced, VOICE_PROVIDERS.advanced),
  };
};
