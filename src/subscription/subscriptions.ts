import { type SubscriptionRowScheme } from "../db/sql/subscriptions.js";
import type { getDb } from "../db/index.js";

export type ActiveSubscriptionItem = {
  subscriptionId: number;
  chatId: number;
  startedAt: Date;
};

type SubscriptionsCache = Map<number, ActiveSubscriptionItem>;

let cache: SubscriptionsCache | null = null;

export const getSubscriptionFromCache = (
  chatId: number,
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
  }, new Map<number, ActiveSubscriptionItem>());
};

export const warmupSubscriptionsCache = async (
  db: ReturnType<typeof getDb>,
): Promise<void> => {
  const rows = await db.getActiveSubscriptions();
  saveSubscriptionsCache(rows);
};
