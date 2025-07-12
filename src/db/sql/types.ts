import { z } from "zod/v4";

export const DbSubscriptionId = z.string().brand<"SubscriptionId">();

export type SubscriptionId = z.infer<typeof DbSubscriptionId>;

export const DbUsageId = z.string().brand<"UsageId">();

export type UsageId = z.infer<typeof DbUsageId>;

export const DbDonationId = z.number().brand<"DonationId">();

export type DonationId = z.infer<typeof DbDonationId>;

export const DbDurationId = z.string().brand<"DurationId">();

export type DurationId = z.infer<typeof DbDurationId>;

export const DbEmailId = z.number().brand<"EmailId">();

export type EmailId = z.infer<typeof DbEmailId>;

export const DbIgnoredChatId = z.string().brand<"IgnoredChatId">();

export type IgnoredChatId = z.infer<typeof DbIgnoredChatId>;

export const DbNodeInstanceId = z.string().brand<"NodeInstanceId">();

export type NodeInstanceId = z.infer<typeof DbNodeInstanceId>;
