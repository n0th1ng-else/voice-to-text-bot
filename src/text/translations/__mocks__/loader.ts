import { vi } from "vitest";

export const initializeMenuLabels = vi.fn(() => {
  return {
    "/start": "Command text",
  };
});

export const initializeTranslationsForLocale = vi.fn(() => {
  return {
    "start.welcomeMessage": "translation text",
    "recognition.voice.tooLong": "{{duration}}",
    "recognition.voice.supportedFormats": "{{formats}}",
    "recognition.voice.time.minutes": "{{minutes}} min",
    "recognition.voice.time.seconds": "{{seconds}} sec",
  };
});
