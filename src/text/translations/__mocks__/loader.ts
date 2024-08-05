import { jest } from "@jest/globals";

export const initializeMenuLabels = jest.fn(() => {
  return {
    "/start": "Command text",
  };
});

export const initializeTranslationsForLocale = jest.fn(() => {
  return {
    "start.welcomeMessage": "translation text",
    "recognition.voice.tooLong": "{{duration}}",
    "recognition.voice.supportedFormats": "{{formats}}",
    "recognition.voice.time.minutes": "{{minutes}} min",
    "recognition.voice.time.seconds": "{{seconds}} sec",
  };
});
