import { type getDb } from "../db/index.js";
import { warmupSubscriptionsCache } from "../subscription/subscriptions.js";

export const warmupCaches = async (
  db: ReturnType<typeof getDb>,
): Promise<void> => {
  await warmupSubscriptionsCache(db);
};
