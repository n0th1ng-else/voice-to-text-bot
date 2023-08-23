export enum LabelId {
  BtnRussian = 1,
  BtnEnglish = 2,
  NoContent = 3,
  InProgress = 4,
  RecognitionFailed = 5,
  RecognitionEmpty = 6,
  WelcomeMessage = 7,
  WelcomeMessageGroup = 8,
  WelcomeMessageMore = 9,
  ChangeLang = 10,
  ChangeLangTitle = 11,
  GithubIssues = 12,
  ContactAuthor = 13,
  SupportCommand = 14,
  LongVoiceMessage = 15,
  UpdateLanguageError = 16,
  StartCommandDescription = 17,
  LanguageCommandDescription = 18,
  SupportCommandDescription = 19,
  DonateCommandDescription = 20,
  DonateCommandMessage = 21,
  AudioNotSupportedMessage = 22,
  SupportedFormatsMessage = 23,
  SupportedFormatsMessageExplanation = 24,
  DonateMessage = 25,
  OfficialChannel = 26,
  PaymentDescription = 27,
  DonationTitle = 28,
  DonationDescription = 29,
  DonationLabel = 30,
}

export type MenuLabel =
  | LabelId.StartCommandDescription
  | LabelId.LanguageCommandDescription
  | LabelId.DonateCommandDescription
  | LabelId.SupportCommandDescription;

export type LabelWithNoMenu = Exclude<LabelId, MenuLabel>;
