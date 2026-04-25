import type { GenericAction } from "./common.js";
import { isVoiceMessage } from "../helpers.js";
import { Logger } from "../../logger/index.js";
import { VoiceContentReason } from "../types.js";
import type { TelegramMessagePrefix } from "../models/messagePrefix.js";
import type { BotMessageModel } from "../models/botMessage.js";
import type { TgMessage } from "../api/types.js";
import { durationLimitSec } from "../../const.js";
import { VoiceBaseAction } from "./voice/voice-base.js";

const logger = new Logger("telegram-bot");

export class VoiceLengthAction extends VoiceBaseAction implements GenericAction {
  private static isVoiceMessageLong(model: BotMessageModel): boolean {
    return model.voiceDuration >= durationLimitSec;
  }

  public runAction(mdl: BotMessageModel, prefix: TelegramMessagePrefix): Promise<void> {
    mdl.analytics.addPageVisit();
    logger.warn("Message is too long", {
      durationSec: mdl.voiceDuration,
      ...prefix,
    });
    mdl.analytics.addTime("voice-length", mdl.voiceDuration * 1_000);
    return this.sendVoiceIsTooLongMessage(mdl, prefix);
  }

  public async runCondition(msg: TgMessage, mdl: BotMessageModel): Promise<boolean> {
    const type = isVoiceMessage(msg);
    const isVoice = type.type === VoiceContentReason.Ok;
    return isVoice && VoiceLengthAction.isVoiceMessageLong(mdl);
  }
}
