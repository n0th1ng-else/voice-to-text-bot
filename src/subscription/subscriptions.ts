import { type SubscriptionRowScheme } from "../db/sql/subscriptions.js";
import type { getDb } from "../db/index.js";
import type { ChatId } from "../telegram/api/core.js";
import type { Currency } from "../telegram/api/groups/payments/payments-types.js";

export type ActiveSubscriptionItem = {
  subscriptionId: number;
  chatId: ChatId;
  startDate: Date;
  endDate: Date | null;
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

const saveSubscriptionsCache = (rows: SubscriptionRowScheme[]): void => {
  cache = rows.reduce((acc, row) => {
    const cachedItem: ActiveSubscriptionItem = {
      subscriptionId: row.subscription_id,
      chatId: row.chat_id,
      startDate: row.start_date,
      endDate: row.end_date,
      amount: row.amount,
      currency: row.currency,
      isStopped: row.is_stopped,
    };
    acc.set(row.chat_id, cachedItem);
    return acc;
  }, new Map<ChatId, ActiveSubscriptionItem>());

  // TODO remove test subscription
  const myChat = 744639 as ChatId;
  cache.set(myChat, {
    subscriptionId: 1231323,
    chatId: myChat,
    startDate: new Date("10.03.2025"),
    endDate: null,
    amount: 100,
    currency: "XTR",
    isStopped: false,
  });
};

export const warmupSubscriptionsCache = async (
  db: ReturnType<typeof getDb>,
): Promise<void> => {
  const rows = await db.getActiveSubscriptions();
  saveSubscriptionsCache(rows);
};
