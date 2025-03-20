const GITHUB_PROJECT = "https://github.com/n0th1ng-else/voice-to-text-bot";

export const githubUrl = `${GITHUB_PROJECT}/issues`;

export const localhostUrl = "http://localhost";

export const officialChannelAccount = "https://t.me/AudioMessBotNews";

export const BOT_LOGO = `${GITHUB_PROJECT}/raw/master/assets/v2/botPic.png`;

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
];

export const donationLevels = {
  stars: [
    {
      amount: 100,
      meta: "⭐",
    },
    {
      amount: 150,
      meta: "⭐⭐",
    },
    {
      amount: 250,
      meta: "⭐⭐⭐",
    },
  ],
  euros: [
    {
      amount: 3,
      meta: "🚀",
    },
    {
      amount: 5,
      meta: "😎",
    },
    {
      amount: 7,
      meta: "👑",
    },
  ],
};
