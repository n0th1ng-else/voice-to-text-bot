import { TelegramBotModel } from "../telegram/bot";
import { ExpressServer } from "../server/express";
import {
  appPort,
  enableSSL,
  googleApi,
  provider,
  selfUrl,
  telegramBotApi,
} from "../env";
import { Logger } from "../logger";
import { VoiceConverterOptions } from "../recognition/types";
import {
  getVoiceConverterInstance,
  getVoiceConverterProvider,
} from "../recognition";
import { getHostName } from "../server/tunnel";

const logger = new Logger("run handler");

export function run() {
  const server = new ExpressServer(appPort, enableSSL, selfUrl);
  const converterOptions: VoiceConverterOptions = {
    googlePrivateKey: googleApi.privateKey,
    googleProjectId: googleApi.projectId,
    googleClientEmail: googleApi.clientEmail,
  };
  const converter = getVoiceConverterInstance(
    getVoiceConverterProvider(provider),
    converterOptions
  );

  const bot = new TelegramBotModel(telegramBotApi, converter);

  getHostName()
    .then((host) => {
      logger.info(`Telling telegram our location is ${host}`);
      return bot.setHostLocation(host, "/bot/message");
    })
    .then(() => server.setBots([bot]).start())
    .catch((err: Error) => logger.error(err));
}
