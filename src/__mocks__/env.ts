import { randomIntFromInterval } from "../common/timer";

process.env.NTBA_FIX_319 = "true"; // Disable some weird logic from "node-telegram-bot-api" package

export const telegramBotName = `BotName-${randomIntFromInterval(1, 100)}`;

export const appVersion = `BotVersion-${randomIntFromInterval(1, 10000)}`;
