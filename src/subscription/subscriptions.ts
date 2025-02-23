import type { SubscriptionRowScheme } from "../db/sql/subscriptions.js";
import type { getDb } from "../db/index.js";
import type { PaymentChargeId, UserId } from "../telegram/api/core.js";
import type { Currency } from "../telegram/api/groups/payments/payments-types.js";
import type { SubscriptionId } from "../db/sql/types.js";

export type ActiveSubscriptionItem = {
  subscriptionId: SubscriptionId;
  startDate: Date;
  endDate: Date;
  isCanceled: boolean;
  amount: number;
  currency: Currency;
  chargeId: PaymentChargeId;
};

type SubscriptionsCache = Map<UserId, ActiveSubscriptionItem>;

let cache: SubscriptionsCache | null = null;

export const getSubscriptionFromCache = (
  userId: UserId,
): ActiveSubscriptionItem | null => {
  if (!cache) {
    throw new Error("cache is not initialized");
  }

  return cache.get(userId) ?? null;
};

const addSubscriptionCacheItem = (row: SubscriptionRowScheme): void => {
  if (!cache) {
    cache = new Map<UserId, ActiveSubscriptionItem>();
  }

  const cachedItem: ActiveSubscriptionItem = {
    subscriptionId: row.subscription_id,
    startDate: row.start_date,
    endDate: row.end_date,
    amount: row.amount,
    currency: row.currency,
    chargeId: row.charge_id,
    isCanceled: row.is_canceled,
  };

  cache.set(row.user_id, cachedItem);
};

export const removeStaleItemsFromCache = (): UserId[] => {
  if (!cache) {
    throw new Error("cache is not initialized");
  }

  const ids: UserId[] = [];
  const now = Date.now();
  cache.forEach((item, userId) => {
    const end = item.endDate.getTime();
    if (end < now) {
      ids.push(userId);
    }
  });

  ids.forEach((userId) => {
    cache?.delete(userId);
  });

  return ids;
};

export const saveSubscriptionsCache = (
  rows: SubscriptionRowScheme | SubscriptionRowScheme[],
): void => {
  if (!cache) {
    cache = new Map<UserId, ActiveSubscriptionItem>();
  }

  const data = Array.isArray(rows) ? rows : [rows];
  data.forEach((row) => {
    addSubscriptionCacheItem(row);
  });
};

export const warmupSubscriptionsCache = async (
  db: ReturnType<typeof getDb>,
): Promise<void> => {
  const rows = await db.getActiveSubscriptions();
  saveSubscriptionsCache(rows);
};
