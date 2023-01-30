import { BotCommand, BotCommandOption } from "./types.js";
import { LabelId } from "../text/labels.js";

export const botCommands: BotCommandOption[] = [
  new BotCommandOption(BotCommand.Support, LabelId.SupportCommandDescription),
  new BotCommandOption(BotCommand.Fund, LabelId.FundCommandDescription),
  new BotCommandOption(BotCommand.Language, LabelId.LanguageCommandDescription),
  new BotCommandOption(BotCommand.Start, LabelId.StartCommandDescription),
];
