import { LanguageCode } from "../recognition/types";

export enum LabelId {
  BtnRussian,
  BtnEnglish,
  NoContent,
  InProgress,
  RecognitionFailed,
  WelcomeMessage,
  WelcomeMessageGroup,
  WelcomeMessageMore,
  ChangeLang,
  ChangeLangTitle,
  GithubIssues,
  ContactAuthor,
  SupportCommand,
  LongVoiceMessage,
  UpdateLanguageError,
  StartCommandDescription,
  LanguageCommandDescription,
  SupportCommandDescription,
  FundCommandDescription,
  FundCommandMessage,
  PatreonLinkTitle,
  AudioNotSupportedMessage,
  SupportedFormatsMessage,
  SupportedFormatsMessageExplanation,
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
    [LabelId.WelcomeMessageGroup]:
      "Если хочешь, можешь добавить меня в группу, и я буду распознавать сообщения там",
    [LabelId.ChangeLang]: "Язык изменен 🆗",
    [LabelId.ChangeLangTitle]: "Какой язык использовать? 🔮",
    [LabelId.WelcomeMessageMore]:
      "Не забудь выбрать язык голосовых сообщений с помощью команды /lang",
    [LabelId.GithubIssues]: "Написать об ошибке",
    [LabelId.ContactAuthor]: "Связаться с автором",
    [LabelId.SupportCommand]: "Поддержка",
    [LabelId.LongVoiceMessage]:
      "Сообщения длиной больше 1 минуты не поддерживаются 🌚",
    [LabelId.UpdateLanguageError]:
      "Не удалось обновить язык. Пожалуйста, попробуйте позже 😔",
    [LabelId.PatreonLinkTitle]: "Поддержать на Патреоне",
    [LabelId.FundCommandMessage]:
      "Спасибо, что пользуетесь ботом. Этот проект не является коммерческим. Тем не менее, он тратит мои ресурсы на то, чтобы быть онлайн 24/7 и превращать голос в текст. Я буду рад, если вы поддержите проект финансово, и поможете мне двигаться дальше. Напишите мне (автору), если у вас возникли вопросы",
    [LabelId.AudioNotSupportedMessage]:
      "Формат аудио файла не поддерживается 🌚",
    [LabelId.SupportedFormatsMessage]:
      "Форматы, с которыми я работаю: *.ogg, *.opus",
    [LabelId.SupportedFormatsMessageExplanation]:
      "Большинство приложений записывают голос в данном формате. Напишите автору, если у вас возникли проблемы с этим",
  },
  [LanguageCode.En]: {
    [LabelId.BtnRussian]: "🇷🇺 Russian",
    [LabelId.BtnEnglish]: "🇺🇸 English",
    [LabelId.NoContent]: "No voice track in the message 🌚",
    [LabelId.InProgress]: "🎙 Processing voice message",
    [LabelId.RecognitionFailed]: "Unable to convert voice 😔",
    [LabelId.WelcomeMessage]:
      "👋🏽 Hey there! Send me a voice message and I will show what they are talking about in plain text",
    [LabelId.WelcomeMessageGroup]:
      "You can add me to a group so I will convert voice messages in there",
    [LabelId.ChangeLang]: "Language has changed 🆗",
    [LabelId.ChangeLangTitle]: "Select the language 🔮",
    [LabelId.WelcomeMessageMore]:
      "Don't forget to select the language you are going to recognise by typing the /lang command",
    [LabelId.GithubIssues]: "Send an issue",
    [LabelId.ContactAuthor]: "Talk to the author",
    [LabelId.SupportCommand]: "Support menu",
    [LabelId.LongVoiceMessage]:
      "Messages with duration more than 1 minute are not supported 🌚",
    [LabelId.UpdateLanguageError]:
      "Failed to update the language. Please try again later 😔",
    [LabelId.LanguageCommandDescription]: "Switch the recognition language",
    [LabelId.SupportCommandDescription]: "Show support links",
    [LabelId.StartCommandDescription]: "Say hello and see bot info",
    [LabelId.FundCommandDescription]: "Help us with funding the project",
    [LabelId.PatreonLinkTitle]: "Donate on Patreon",
    [LabelId.FundCommandMessage]:
      "I hope you found the bot useful and have fun using its skills. This bot is a non-commercial project. Nevertheless, it requires resources to keep converting voice into text. I would ask you to support the project and fund us so I can keep the bot up and running. Contact me (the author) if you have any questions related",
    [LabelId.AudioNotSupportedMessage]:
      "The audio file format is not supported at the moment 🌚",
    [LabelId.SupportedFormatsMessage]:
      "I work with these formats: *.ogg, *.opus",
    [LabelId.SupportedFormatsMessageExplanation]:
      "Typically, most messengers record voice in this format. Contact the author if you experience any problems",
  },
};
