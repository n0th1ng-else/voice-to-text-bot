import { LanguageCode } from "../recognition/types";

export enum LabelId {
  BtnRussian,
  BtnEnglish,
  NoContent,
  InProgress,
  RecognitionFailed,
  WelcomeMessage,
  ChangeLang,
  ChangeLangTitle,
}

export const labels = {
  [LanguageCode.Ru]: {
    [LabelId.BtnRussian]: "Русский",
    [LabelId.BtnEnglish]: "Английский",
    [LabelId.NoContent]: "Голосовое сообщение не найдено 🌚",
    [LabelId.InProgress]: "🎙 Распознаю голос",
    [LabelId.RecognitionFailed]: "Не получилось распознать голос 😔",
    [LabelId.WelcomeMessage]:
      "Привет! отправь мне голсовое сообщение и я распознаю его в текст",
    [LabelId.ChangeLang]: "Язык изменен",
    [LabelId.ChangeLangTitle]: "Какой язык использовать?",
  },
  [LanguageCode.En]: {
    [LabelId.BtnRussian]: "Russian",
    [LabelId.BtnEnglish]: "English",
    [LabelId.NoContent]: "No voice track in the message 🌚",
    [LabelId.InProgress]: "🎙 Processing voice message",
    [LabelId.RecognitionFailed]: "Unable to convert voice 😔",
    [LabelId.WelcomeMessage]:
      "Hey here! Send me a voice message and I will show what they are talking about in plain text",
    [LabelId.ChangeLang]: "Language has changed",
    [LabelId.ChangeLangTitle]: "Select the language",
  },
};
