import { randomIntFromInterval } from "../common/timer.js";

process.env.NTBA_FIX_319 = "true"; // Disable some weird logic from "node-telegram-bot-api" package

export const telegramBotName = `BotName-${randomIntFromInterval(1, 100)}`;

export const appVersion = `BotVersion-${randomIntFromInterval(1, 10000)}`;

export const analyticsId = `analytics-${randomIntFromInterval(1, 1000)}`;

export const analytics = {
  apiSecret: `v4-secret-${randomIntFromInterval(1, 1000)}`,
  measurementId: `v4-${randomIntFromInterval(1, 1000)}`,
};
