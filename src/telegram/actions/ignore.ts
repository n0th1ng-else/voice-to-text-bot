import { GenericAction } from "./common.js";
import { Logger } from "../../logger/index.js";
import { collectAnalytics } from "../../analytics/index.js";
import type { TelegramMessagePrefix } from "../models/messagePrefix.js";
import type { BotMessageModel } from "../models/botMessage.js";
import type { TgMessage } from "../api/types.js";

const logger = new Logger("telegram-bot");

export class IgnoreAction extends GenericAction {
  public async runAction(mdl: BotMessageModel, prefix: TelegramMessagePrefix): Promise<void> {
    mdl.analytics.addFirstVisit();
    mdl.analytics.addPageVisit();
    logger.warn(`${prefix.getPrefix()} Chat is in the ignore list, skipping`, {
      chatId: mdl.chatId,
    });
    return collectAnalytics(
      mdl.analytics.setCommand("/ignore", "Chat is in the ignore list", String(mdl.chatId)),
    );
  }

  public async runCondition(_msg: TgMessage, mdl: BotMessageModel): Promise<boolean> {
    try {
      const row = await this.stat.getIgnoredChatRow(mdl.chatId);
      if (!row) {
        return false;
      }

      return row.ignore;
    } catch {
      return false;
    }
  }
}
