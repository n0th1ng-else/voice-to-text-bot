export const githubUrl = "https://github.com/n0th1ng-else/voice-to-text-bot";

export const localhostUrl = "http://localhost";

export const patreonAccount = "https://patreon.com/audiomessbot";

export const kofiAccount = "https://ko-fi.com/audiomessbot";

export const yandexAccount = "https://yasobe.ru/na/audiomessbot";

export const officialChannelAccount = "https://t.me/AudioMessBotNews";

export const wavSampleRate = 16_000; // 16kHz

export const secondsInOneMinute = 60;

export const durationLimitSec = 90;

export const supportedAudioFormats = [
  {
    mimeType: "audio/ogg",
    ext: "ogg",
  },
  {
    mimeType: "audio/opus",
    ext: "opus",
  },
  {
    mimeType: "audio/x-opus+ogg",
    ext: "ogg",
  },
  {
    mimeType: "audio/mpeg",
    ext: "m4a",
  },
] as const;
