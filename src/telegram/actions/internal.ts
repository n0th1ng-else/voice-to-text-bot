import { GenericAction } from "./common.js";
import {
  BotCommand,
  BotMessageModel,
  TelegramButtonModel,
  type TelegramMessagePrefix,
} from "../types.js";
import { isCommandMessage, isOwner } from "../helpers.js";
import { Logger } from "../../logger/index.js";
import { collectAnalytics } from "../../analytics/index.js";
import type { TgMessage } from "../api/types.js";
import type { AnalyticsData } from "../../analytics/ga/types.js";
import type { TgInlineKeyboardButton } from "../api/groups/chats/chats-types.js";
import { generateMemorySnapshot } from "../../profiling/memory.js";

const logger = new Logger("telegram-bot");

type InternalMenuAction = "mp";

const getInternalButton = (
  action: InternalMenuAction,
  logPrefix: string,
): TelegramButtonModel => {
  return new TelegramButtonModel<InternalMenuAction>("i", action, logPrefix);
};

export class InternalAction extends GenericAction {
  public runAction(
    mdl: BotMessageModel,
    prefix: TelegramMessagePrefix,
  ): Promise<void> {
    mdl.analytics.addPageVisit();
    return this.showInternalMenu(mdl, prefix);
  }

  public async runCondition(
    msg: TgMessage,
    mdl: BotMessageModel,
  ): Promise<boolean> {
    const isOwners = isOwner(mdl.userId);
    const isInternalMessage = isCommandMessage(mdl, msg, BotCommand.Internal);
    return Promise.resolve(isOwners && isInternalMessage);
  }

  public async runCallback(
    msg: TgMessage,
    button: TelegramButtonModel,
    analytics: AnalyticsData,
  ): Promise<void> {
    analytics.addPageVisit();
    return await this.handleInternalAction(msg, button, analytics);
  }

  private async handleInternalAction(
    message: TgMessage,
    button: TelegramButtonModel,
    analytics: AnalyticsData,
  ): Promise<void> {
    const model = new BotMessageModel(message, analytics);
    analytics.setId(model.chatId);
    if (button.value === "mp") {
      const file = await generateMemorySnapshot();
      return this.bot.sendFile(model.chatId, file);
    }

    await collectAnalytics(
      analytics.setCommand(
        BotCommand.Internal,
        "Internal action message",
        "Callback",
      ),
    );
  }

  private async showInternalMenu(
    model: BotMessageModel,
    prefix: TelegramMessagePrefix,
  ): Promise<void> {
    logger.info(`${prefix.getPrefix()} Sending internal menu selection`);

    const memorySnapshot = getInternalButton("mp", prefix.id);
    const memorySnapshotBtn: TgInlineKeyboardButton = {
      text: "Memory snapshot",
      callback_data: memorySnapshot.getDtoString(),
    };

    try {
      await this.sendRawMessage(model.chatId, "Internal menu", "en-US", {
        buttons: [[memorySnapshotBtn]],
      });
      logger.info(`${prefix.getPrefix()} Internal menu sent`);
    } catch (err) {
      const errorMessage = "Unable to send internal menu";
      logger.error(`${prefix.getPrefix()} ${errorMessage}`, err);
      model.analytics.addError(errorMessage);
    }
    await collectAnalytics(
      model.analytics.setCommand(
        BotCommand.Language,
        "Language message",
        "Init",
      ),
    );
  }
}
