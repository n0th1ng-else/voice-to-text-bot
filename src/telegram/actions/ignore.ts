import { GenericAction } from "./common.js";
import { Logger } from "../../logger/index.js";
import { collectAnalytics } from "../../analytics/index.js";
import { TelegramMessagePrefix, type BotMessageModel } from "../types.js";
import type { TgMessage } from "../api/types.js";

const logger = new Logger("telegram-bot");

export class IgnoreAction extends GenericAction {
  public async runAction(
    mdl: BotMessageModel,
    prefix: TelegramMessagePrefix,
  ): Promise<void> {
    mdl.analytics.addFirstVisit();
    mdl.analytics.addPageVisit();
    logger.warn(`${prefix.getPrefix()} Chat is in the ignore list, skipping`, {
      chatId: mdl.chatId,
    });
    return collectAnalytics(
      mdl.analytics.setCommand(
        "/ignore",
        "Chat is in the ignore list",
        String(mdl.chatId),
      ),
    );
  }

  public async runCondition(
    msg: TgMessage,
    mdl: BotMessageModel,
  ): Promise<boolean> {
    const ignoredChatRow = await this.stat.getIgnoredChatRow(mdl.chatId);
    if (!ignoredChatRow) {
      return false;
    }
    return Promise.resolve(ignoredChatRow.ignore);
  }
}
