export const TranslationKeys = {
  WelcomeMessage: "start.welcomeMessage",
  WelcomeMessageGroup: "start.groupSupport",
  WelcomeMessageMore: "start.changeLanguage",
  NoContent: "telegram.messages.voiceNotFound",
  InProgress: "recognition.voice.processing",
  RecognitionFailed: "recognition.voice.error",
  RecognitionEmpty: "recognition.voice.empty",
  ChangeLang: "language.changeSaved",
  ChangeLangTitle: "language.selectLanguage",
  GithubIssues: "contact.createIssueReport",
  ContactAuthor: "contact.contactAuthor",
  SupportCommand: "contact.contactMessage",
  LongVoiceMessage: "recognition.voice.tooLong",
  UpdateLanguageError: "language.changeLanguage.error",
  DonateCommandMessage: "donate.description",
  AudioNotSupportedMessage: "recognition.voice.notSupported",
  SupportedFormatsMessage: "recognition.voice.supportedFormats",
  SupportedFormatsMessageExplanation:
    "recognition.voice.supportedFormats.description",
  DonateMessage: "donate.commandMessage",
  OfficialChannel: "contact.newsChannel",
  PaymentDescription: "donate.payment.description",
  DonationTitle: "donate.payment.form.title",
  DonationDescription: "donate.payment.form.description",
  DonationLabel: "donate.payment.form.label",
  FormattedTimeMinutes: "recognition.voice.time.minutes",
  FormattedTimeSeconds: "recognition.voice.time.seconds",
  BtnEnglish: "language.button.english",
  BtnRussian: "language.button.russian",
  BtnDutch: "language.button.dutch",
} as const;

export type TranslationKey =
  (typeof TranslationKeys)[keyof typeof TranslationKeys];

export type TranslationKeyFull =
  | TranslationKey
  | [TranslationKey, Record<string, string>];
