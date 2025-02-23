import { type SubscriptionRowScheme } from "../db/sql/subscriptions.js";
import type { getDb } from "../db/index.js";
import type { ChatId } from "../telegram/api/core.js";
import type { Currency } from "../telegram/api/groups/payments/payments-types.js";

export type ActiveSubscriptionItem = {
  subscriptionId: number;
  chatId: ChatId;
  startDate: Date;
  endDate: Date;
  isStopped: boolean;
  amount: number;
  currency: Currency;
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

export const addSubscriptionCacheItem = (row: SubscriptionRowScheme): void => {
  const cachedItem: ActiveSubscriptionItem = {
    subscriptionId: row.subscription_id,
    chatId: row.chat_id,
    startDate: row.start_date,
    endDate: row.end_date,
    amount: row.amount,
    currency: row.currency,
    isStopped: row.is_stopped,
  };
  if (!cache) {
    cache = new Map<ChatId, ActiveSubscriptionItem>();
  }

  cache.set(row.chat_id, cachedItem);
};

export const removeSubscriptionCacheItem = (chatId: ChatId): void => {
  if (!cache) {
    cache = new Map<ChatId, ActiveSubscriptionItem>();
  }

  cache.delete(chatId);
};

const saveSubscriptionsCache = (rows: SubscriptionRowScheme[]): void => {
  rows.forEach((row) => {
    addSubscriptionCacheItem(row);
  });
};

export const warmupSubscriptionsCache = async (
  db: ReturnType<typeof getDb>,
): Promise<void> => {
  const rows = await db.getActiveSubscriptions();
  saveSubscriptionsCache(rows);
};
