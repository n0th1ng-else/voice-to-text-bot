import { LanguageCode } from "../recognition/types";

export enum LabelId {
  BtnRussian,
  BtnEnglish,
  NoContent,
  InProgress,
  RecognitionFailed,
  WelcomeMessage,
  WelcomeMessageMore,
  ChangeLang,
  ChangeLangTitle,
  GithubIssues,
  ContactAuthor,
  SupportCommand,
  LongVoiceMessage,
}

export const labels = {
  [LanguageCode.Ru]: {
    [LabelId.BtnRussian]: "🇷🇺 Русский",
    [LabelId.BtnEnglish]: "🇺🇸 Английский",
    [LabelId.NoContent]: "Голосовое сообщение не найдено 🌚",
    [LabelId.InProgress]: "🎙 Распознаю голос",
    [LabelId.RecognitionFailed]: "Не получилось распознать голос 😔",
    [LabelId.WelcomeMessage]:
      "👋🏽 Привет! отправь мне голосовое сообщение и я распознаю его в текст",
    [LabelId.ChangeLang]: "🆗 Язык изменен",
    [LabelId.ChangeLangTitle]: "Какой язык использовать? 🔮",
    [LabelId.GithubIssues]: "Отправить issue на GitHub",
    [LabelId.ContactAuthor]: "Связаться с автором",
    [LabelId.SupportCommand]: "Поддержка",
    [LabelId.LongVoiceMessage]:
      "Сообщения длиной больше 1 минуты не поддерживаются 🌚",
  },
  [LanguageCode.En]: {
    [LabelId.BtnRussian]: "🇷🇺 Russian",
    [LabelId.BtnEnglish]: "🇺🇸 English",
    [LabelId.NoContent]: "No voice track in the message 🌚",
    [LabelId.InProgress]: "🎙 Processing voice message",
    [LabelId.RecognitionFailed]: "Unable to convert voice 😔",
    [LabelId.WelcomeMessage]:
      "👋🏽 Hey here! Send me a voice message and I will show what they are talking about in plain text",
    [LabelId.ChangeLang]: "🆗 Language has changed",
    [LabelId.ChangeLangTitle]: "Select the language 🔮",
    [LabelId.WelcomeMessageMore]:
      "Don't forget to select the language you are going to recognise by typing the /lang command.\nНе забудь выбрать язык голосовых сообщений с помощью команды /lang",
    [LabelId.GithubIssues]: "Send me an issue (GitHub)",
    [LabelId.ContactAuthor]: "Talk to author",
    [LabelId.SupportCommand]: "Support menu",
    [LabelId.LongVoiceMessage]:
      "Messages with duration more than 1 minute are not supported 🌚",
  },
};
