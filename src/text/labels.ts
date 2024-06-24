import { getMaxDuration, getSupportedAudioFormats } from "./utils.js";
import { LabelId, type LabelWithNoMenu, type MenuLabel } from "./types.js";
import type { LanguageCode } from "../recognition/types.js";

export const menuLabels: Record<MenuLabel, string> = {
  [LabelId.LanguageCommandDescription]: "Switch the recognition language",
  [LabelId.SupportCommandDescription]: "Show support links",
  [LabelId.StartCommandDescription]: "Say hello and see bot info",
  [LabelId.DonateCommandDescription]: "Help us with funding the project",
} as const;

export const labels: Record<LanguageCode, Record<LabelWithNoMenu, string>> = {
  // Russian
  ["ru-RU"]: {
    // "start" command
    [LabelId.WelcomeMessage]:
      "👋🏽 Привет! отправь мне голосовое сообщение и я распознаю его в текст",
    [LabelId.WelcomeMessageGroup]:
      "Ты можешь добавить меня в группу, и я буду распознавать сообщения от каждого участника!" +
      "\n\n" +
      "И еще кое-что... Я умею распознавать видео сообщения (круглые видео) 🎉",
    [LabelId.WelcomeMessageMore]:
      "Не забудь выбрать язык голосовых сообщений с помощью команды /lang",
    [LabelId.DonateMessage]:
      "Вы можете помочь и поддержать проект. Выполните /donate для подробностей",
    // "lang" command
    [LabelId.ChangeLangTitle]: "Какой язык использовать? 🔮",
    [LabelId.ChangeLang]: "Язык изменен 🆗",
    [LabelId.BtnRussian]: "🇷🇺 Русский",
    [LabelId.BtnEnglish]: "🇺🇸 Английский",
    [LabelId.BtnUkrainian]: "🇺🇦 Украинский",
    [LabelId.UpdateLanguageError]:
      "Не удалось обновить язык. Пожалуйста, попробуйте позже 😔",
    // "support" command
    [LabelId.SupportCommand]:
      "Если у вас возникли вопросы и предложения, вы можете связаться с автором одним из следующих способов",
    [LabelId.OfficialChannel]: "Новости и обсуждения",
    [LabelId.ContactAuthor]: "Написать автору",
    [LabelId.GithubIssues]: "Написать об ошибке",

    [LabelId.NoContent]: "Голосовое сообщение не найдено 🌚",
    [LabelId.InProgress]: "🎙 Распознаю голос",
    [LabelId.RecognitionFailed]: "Не получилось распознать голос 😔",
    // "fund" command
    [LabelId.DonateCommandMessage]:
      "Этот проект не является коммерческим. Тем не менее, он тратит мои ресурсы на то, чтобы превращать голос в текст." +
      "\n\n" +
      "Я буду рад, если вы поддержите проект финансово и поможете оплатить инфраструктуру для моего Телеграм бота. " +
      "Eсли у вас возникли вопросы, вы можете написать в группу новостей бота - ссылка прикреплена в описании." +
      "\n\n" +
      "Я принимаю пожертвования на безвоздмездной основе. Все средства идут на оплату облачного провайдера, где размещен бот. " +
      "За пожертвования вы не получите эксклюзивных функиций, но поможете сохранить проект активным 24/7." +
      "\n\n" +
      "Спасибо, что помогаете проекту жить!" +
      "\n\n" +
      'Мы используем платформу <a href="https://stripe.com">Stripe</a> для сбора донатов, один из самых популярных провайдеров ' +
      "для проведения платежей для того, чтобы сделать процесс безопасным и удобным",
    [LabelId.PaymentDescription]:
      "Пожертвование для Telegram бота AudioMessBot. Не подлежит возврату. Спасибо вам за поддержку!" +
      "\n\n" +
      "Мы используем Stripe для проведения платежей, все транзакции защищены и безопасны",
    [LabelId.DonationTitle]: "Поддержите AudioMessBot",
    [LabelId.DonationDescription]:
      "Я приглашаю вас оплатить пожертвование в поддержку моего проекта. " +
      "Мы используем Stripe для проведения платежей, все транзакции защищены и безопасны",
    [LabelId.DonationLabel]: "Единоразовое пожертвование",
    [LabelId.LongVoiceMessage]: `Сообщения длиной больше ${getMaxDuration(
      "мин",
      "сек",
    )} не поддерживаются 🌚`,
    [LabelId.AudioNotSupportedMessage]:
      "Формат аудио файла не поддерживается 🌚",
    [LabelId.SupportedFormatsMessage]: `Форматы, с которыми я работаю: ${getSupportedAudioFormats()}`,
    [LabelId.SupportedFormatsMessageExplanation]:
      "Большинство приложений записывают голос в одном из этих форматов. Напишите автору, если у вас возникли проблемы с этим",
    [LabelId.RecognitionEmpty]: "Я не смог найти текст в сообщении 🤔",
  },
  // English
  ["en-US"]: {
    // "start" command
    [LabelId.WelcomeMessage]:
      "👋🏽 Hey there! Send me a voice message and I will show what they are talking about in plain text",
    [LabelId.WelcomeMessageGroup]:
      "You can add me to a group so I will convert voice messages from all the participants!" +
      "\n\n" +
      "Even better, I can recognise video notes (Telegram video circles) as well 🎉",
    [LabelId.WelcomeMessageMore]:
      "Do not forget to select the language you want to recognise by typing the /lang command",
    [LabelId.DonateMessage]:
      "Support this project. Run /donate command for details",
    // "lang" command
    [LabelId.ChangeLangTitle]: "Select the language 🔮",
    [LabelId.ChangeLang]: "Language has been changed 🆗",
    [LabelId.BtnRussian]: "🇷🇺 Russian",
    [LabelId.BtnEnglish]: "🇺🇸 English",
    [LabelId.BtnUkrainian]: "🇺🇦 Ukraine",
    [LabelId.UpdateLanguageError]:
      "Failed to update the language. Please try again later 😔",
    // "support" command
    [LabelId.SupportCommand]:
      "If you have any questions, you can contact the author using one of the following options",
    [LabelId.OfficialChannel]: "News and discussions",
    [LabelId.ContactAuthor]: "Chat with the author",
    [LabelId.GithubIssues]: "Report an issue",

    [LabelId.NoContent]: "No voice track found in the message 🌚",
    [LabelId.InProgress]: "🎙 Processing voice message",
    [LabelId.RecognitionFailed]: "Unable to convert voice 😔",
    // "donate" command
    [LabelId.DonateCommandMessage]:
      "This bot is a non-commercial project. Nevertheless, it requires resources to keep converting voice into text." +
      "\n\n" +
      "I would love to ask you to support the project and donate some money so I can pay for the infrastructure, thus keep making the bot available 24/7. " +
      "Contact me (the author) if you have any donations-related questions." +
      "\n\n" +
      "All donations are non-refundable. " +
      "You will not get any extra bonuses by donating me some money, but you will take part in having the bot up all day long." +
      "\n\n" +
      "Thank you for supporting the project!" +
      "\n\n" +
      'We use <a href="https://stripe.com">Stripe</a>, the world-leading payments provider to make sure the donation process ' +
      "is safe and secure",
    [LabelId.PaymentDescription]:
      "AudioMessBot telegram bot donation. Non-refundable. Appreciate your support!" +
      "\n\n" +
      "We use Stripe as our payment provider, all transactions are safe and secure",
    [LabelId.DonationTitle]: "Support AudioMessBot",
    [LabelId.DonationDescription]:
      "I invite you to make a small one-time donation to support my project. " +
      "We use Stripe as our payment provider, all transactions are safe and secure",
    [LabelId.DonationLabel]: "One-time donation",

    // voice recognition
    [LabelId.LongVoiceMessage]: `I do not support messages longer than ${getMaxDuration(
      "min",
      "sec",
    )} at the moment 🌚`,
    [LabelId.AudioNotSupportedMessage]:
      "The audio file format is not supported at the moment 🌚",
    [LabelId.SupportedFormatsMessage]: `I work with these formats: ${getSupportedAudioFormats()}`,
    [LabelId.SupportedFormatsMessageExplanation]:
      "Typically, most messengers record voice in one of these formats. Contact the author if you experience any problems",
    [LabelId.RecognitionEmpty]: "I could not find any text in the message 🤔",
  },
  // Ukrainian
  ["uk"]: {
    // "start" command
    [LabelId.WelcomeMessage]:
      "👋🏽 Hey there! Send me a voice message and I will show what they are talking about in plain text",
    [LabelId.WelcomeMessageGroup]:
      "You can add me to a group so I will convert voice messages from all the participants!" +
      "\n\n" +
      "Even better, I can recognise video notes (Telegram video circles) as well 🎉",
    [LabelId.WelcomeMessageMore]:
      "Do not forget to select the language you want to recognise by typing the /lang command",
    [LabelId.DonateMessage]:
      "Support this project. Run /donate command for details",
    // "lang" command
    [LabelId.ChangeLangTitle]: "Select the language 🔮",
    [LabelId.ChangeLang]: "Language has been changed 🆗",
    [LabelId.BtnRussian]: "🇷🇺 Russian",
    [LabelId.BtnEnglish]: "🇺🇸 English",
    [LabelId.BtnUkrainian]: "🇺🇦 Ukraine",
    [LabelId.UpdateLanguageError]:
      "Failed to update the language. Please try again later 😔",
    // "support" command
    [LabelId.SupportCommand]:
      "If you have any questions, you can contact the author using one of the following options",
    [LabelId.OfficialChannel]: "News and discussions",
    [LabelId.ContactAuthor]: "Chat with the author",
    [LabelId.GithubIssues]: "Report an issue",

    [LabelId.NoContent]: "No voice track found in the message 🌚",
    [LabelId.InProgress]: "🎙 Processing voice message",
    [LabelId.RecognitionFailed]: "Unable to convert voice 😔",
    // "donate" command
    [LabelId.DonateCommandMessage]:
      "This bot is a non-commercial project. Nevertheless, it requires resources to keep converting voice into text." +
      "\n\n" +
      "I would love to ask you to support the project and donate some money so I can pay for the infrastructure, thus keep making the bot available 24/7. " +
      "Contact me (the author) if you have any donations-related questions." +
      "\n\n" +
      "All donations are non-refundable. " +
      "You will not get any extra bonuses by donating me some money, but you will take part in having the bot up all day long." +
      "\n\n" +
      "Thank you for supporting the project!" +
      "\n\n" +
      'We use <a href="https://stripe.com">Stripe</a>, the world-leading payments provider to make sure the donation process ' +
      "is safe and secure",
    [LabelId.PaymentDescription]:
      "AudioMessBot telegram bot donation. Non-refundable. Appreciate your support!" +
      "\n\n" +
      "We use Stripe as our payment provider, all transactions are safe and secure",
    [LabelId.DonationTitle]: "Support AudioMessBot",
    [LabelId.DonationDescription]:
      "I invite you to make a small one-time donation to support my project. " +
      "We use Stripe as our payment provider, all transactions are safe and secure",
    [LabelId.DonationLabel]: "One-time donation",

    // voice recognition
    [LabelId.LongVoiceMessage]: `I do not support messages longer than ${getMaxDuration(
      "min",
      "sec",
    )} at the moment 🌚`,
    [LabelId.AudioNotSupportedMessage]:
      "The audio file format is not supported at the moment 🌚",
    [LabelId.SupportedFormatsMessage]: `I work with these formats: ${getSupportedAudioFormats()}`,
    [LabelId.SupportedFormatsMessageExplanation]:
      "Typically, most messengers record voice in one of these formats. Contact the author if you experience any problems",
    [LabelId.RecognitionEmpty]: "I could not find any text in the message 🤔",
  },
} as const;
