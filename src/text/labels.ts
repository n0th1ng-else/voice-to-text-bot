import { LanguageCode } from "../recognition/types";
import { durationLimitSec, secondsInOneMinute } from "../const";

const getMaxDuration = (minutes: string, seconds: string): string => {
  if (durationLimitSec < secondsInOneMinute) {
    return `${durationLimitSec} ${seconds}`;
  }
  const mins = Math.floor(durationLimitSec / secondsInOneMinute);
  const secs = durationLimitSec - mins * secondsInOneMinute;
  return secs ? `${mins} ${minutes} ${secs} ${seconds}` : `${mins} ${minutes}`;
};

export enum LabelId {
  BtnRussian,
  BtnEnglish,
  NoContent,
  InProgress,
  RecognitionFailed,
  RecognitionEmpty,
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
  KofiLinkTitle,
  YandexLinkTitle,
  DonateMessage,
  OfficialChannel,
  PaymentDescription,
  PaymentLink,
  PaymentLinkButton,
  UsdOption1,
  UsdOption2,
  UsdOption3,
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
    [LabelId.SupportCommand]:
      "Если у вас возникли вопросы и предложения, вы можете связаться со мной одним из следующих способов",
    [LabelId.LongVoiceMessage]: `Сообщения длиной больше ${getMaxDuration(
      "мин",
      "сек"
    )} не поддерживаются 🌚`,
    [LabelId.UpdateLanguageError]:
      "Не удалось обновить язык. Пожалуйста, попробуйте позже 😔",
    [LabelId.PatreonLinkTitle]: "Подписаться на Патреоне",
    [LabelId.FundCommandMessage]:
      "Этот проект не является коммерческим. Тем не менее, он тратит мои ресурсы на то, чтобы быть онлайн 24/7 и превращать голос в текст.\n\nЯ буду рад, если вы поддержите проект финансово и поможете мне двигаться дальше. Напишите мне (автору), если у вас возникли вопросы.\n\nЯ принимаю пожертвования на безвоздмездной основе. Все средства идут на оплату сервиса Google Speech-to-Text (в прошлом месяце я потратил 100$). За пожертвования вы не получите эксклюзивных функиций, но поможете сохранить проект активным.\n\nСпасибо, что помогаете проекту жить!",
    [LabelId.AudioNotSupportedMessage]:
      "Формат аудио файла не поддерживается 🌚",
    [LabelId.SupportedFormatsMessage]:
      "Форматы, с которыми я работаю: *.ogg, *.opus",
    [LabelId.SupportedFormatsMessageExplanation]:
      "Большинство приложений записывают голос в данном формате. Напишите автору, если у вас возникли проблемы с этим",
    [LabelId.KofiLinkTitle]: "Отправить через Paypal",
    [LabelId.YandexLinkTitle]: "Перевод в Рублях (₽)",
    [LabelId.DonateMessage]:
      "Вы можете помочь и поддержать проект. Выполните /fund для подробностей",
    [LabelId.OfficialChannel]: "Новости и обсуждения",
    [LabelId.PaymentDescription]:
      "Пожертвование для Telegram бота AudioMessBot. Не подлежит возврату. Спасибо вам за поддержку!",
    [LabelId.PaymentLink]: "Ваша ссылка для оплаты",
    [LabelId.PaymentLinkButton]: "Оплатить",
    [LabelId.RecognitionEmpty]: "Я не смог найти текст в сообщении 🤔",
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
    [LabelId.SupportCommand]:
      "If you have any questions, you can contact me using one of the following options",
    [LabelId.LongVoiceMessage]: `Messages with duration more than ${getMaxDuration(
      "min",
      "sec"
    )} are not supported 🌚`,
    [LabelId.UpdateLanguageError]:
      "Failed to update the language. Please try again later 😔",
    [LabelId.LanguageCommandDescription]: "Switch the recognition language",
    [LabelId.SupportCommandDescription]: "Show support links",
    [LabelId.StartCommandDescription]: "Say hello and see bot info",
    [LabelId.FundCommandDescription]: "Help us with funding the project",
    [LabelId.PatreonLinkTitle]: "Subscribe on Patreon",
    [LabelId.FundCommandMessage]:
      "This bot is a non-commercial project. Nevertheless, it requires resources to keep converting voice into text.\n\nI would love to ask you to support the project and fund us so I can keep the bot up and running. Contact me (the author) if you have any questions related.\n\nAll donations are non-refundable. I use donations to pay for Google Speech-to-Text service usages (last month it was 100$). You would not get and extra bonuses for donating me some money, but you will take part in having the bot up all day long.\n\nThank you for supporting the project!",
    [LabelId.AudioNotSupportedMessage]:
      "The audio file format is not supported at the moment 🌚",
    [LabelId.SupportedFormatsMessage]:
      "I work with these formats: *.ogg, *.opus",
    [LabelId.SupportedFormatsMessageExplanation]:
      "Typically, most messengers record voice in this format. Contact the author if you experience any problems",
    [LabelId.KofiLinkTitle]: "Send money via Paypal",
    [LabelId.YandexLinkTitle]: "Donate in Rubles (₽)",
    [LabelId.DonateMessage]:
      "Help us to keep the bot alive. Run /fund command for details",
    [LabelId.OfficialChannel]: "News and discussions",
    [LabelId.PaymentDescription]:
      "AudioMessBot telegram bot donation. Non-refundable. Appreciate your support!",
    [LabelId.PaymentLink]: "This is your donation link",
    [LabelId.PaymentLinkButton]: "Donate",
    [LabelId.UsdOption1]: "5$ 😎",
    [LabelId.UsdOption2]: "7$ 👑",
    [LabelId.UsdOption3]: "10$ ‍🚀",
    [LabelId.RecognitionEmpty]: "I could not find the text in the message 🤔",
  },
};
