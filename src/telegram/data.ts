import { BotCommand, BotCommandOption } from "./types";
import { LabelId } from "../text/labels";

export const botCommands: BotCommandOption[] = [
  new BotCommandOption(BotCommand.Language, LabelId.LanguageCommandDescription),
  new BotCommandOption(BotCommand.Support, LabelId.SupportCommandDescription),
  new BotCommandOption(BotCommand.Fund, LabelId.FundCommandDescription),
  new BotCommandOption(BotCommand.Start, LabelId.StartCommandDescription),
];
