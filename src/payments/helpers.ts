import type { BotMessageModel } from "../telegram/model.js";

export const isDonation = (mdl: BotMessageModel): boolean => {
  const isPayment = Boolean(mdl.paymentChargeId);
  const isSubscription = mdl.isSubscriptionPayment;
  return isPayment && !isSubscription;
};

export const isSubscriptionPayment = (mdl: BotMessageModel): boolean => {
  const isPayment = Boolean(mdl.paymentChargeId);
  const isSubscription = mdl.isSubscriptionPayment;
  return isPayment && isSubscription;
};
