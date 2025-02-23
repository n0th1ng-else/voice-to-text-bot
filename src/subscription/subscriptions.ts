import { type SubscriptionRowScheme } from "../db/sql/subscriptions.js";
import type { getDb } from "../db/index.js";
import type { ChatId } from "../telegram/api/core.js";

export type ActiveSubscriptionItem = {
  subscriptionId: number;
  chatId: ChatId;
  startedAt: Date;
};

type SubscriptionsCache = Map<ChatId, ActiveSubscriptionItem>;

let cache: SubscriptionsCache | null = null;

export const getSubscriptionFromCache = (
  chatId: ChatId,
): ActiveSubscriptionItem | null => {
  if (!cache) {
    throw new Error("cache is not initialized");
  }

  return cache.get(chatId) ?? null;
};

const saveSubscriptionsCache = (rows: SubscriptionRowScheme[]): void => {
  cache = rows.reduce((acc, row) => {
    const cachedItem: ActiveSubscriptionItem = {
      subscriptionId: row.subscription_id,
      chatId: row.chat_id,
      startedAt: row.started_at,
    };
    acc.set(row.chat_id, cachedItem);
    return acc;
  }, new Map<ChatId, ActiveSubscriptionItem>());

  // TODO remove test subscription
  const myChat = 744639 as ChatId;
  cache.set(myChat, {
    chatId: myChat,
    startedAt: new Date("10.03.2025"),
    subscriptionId: 1231323,
  });
};

export const warmupSubscriptionsCache = async (
  db: ReturnType<typeof getDb>,
): Promise<void> => {
  const rows = await db.getActiveSubscriptions();
  saveSubscriptionsCache(rows);
};
